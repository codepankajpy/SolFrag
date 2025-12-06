import * as THREE from 'three';
import { Camera } from './core/Camera';
import { Scene } from './core/Scene';
import { Renderer } from './core/Renderer';
import { Controls } from './core/Controls';
import { Physics } from './physics/Physics';
import { Player } from './player/Player';
import { RemotePlayer } from './player/RemotePlayer';
import { LoadingScreen } from './ui/LoadingScreen';
import { HomeScreen } from './ui/HomeScreen';
import { GameNotifications } from './ui/GameNotifications';
import { HealthUI } from './ui/Health';
import { DeathOverlay } from './ui/DeathOverlay';
import { Scoreboard } from './ui/Scoreboard';
import { GAME_CONSTANTS } from '../shared/constants/game.constants';
import { Connection, PublicKey } from '@solana/web3.js';
import { getProvider, createMatch, joinMatch, recordKill, finishMatch } from './onchain/anchorClient';
import { NetworkClient } from './network/NetworkClient';
import { AudioSystem } from './audio/AudioSystem';

let player: Player;
let physics: Physics;
let lastTime = 0;
let gameStarted = false;
let playerUsername = '';
let networkClient: NetworkClient;
let audioSystem: AudioSystem;
let remotePlayers: Map<string, RemotePlayer> = new Map();
let localPlayerId: string | null = null;
let healthUI: any = null;
let deathOverlay: DeathOverlay | null = null;
let scoreboard: Scoreboard | null = null;
let localWasAlive = true;
let anchorProvider: any = null;
let currentMatchId: number | null = null;
let matchOwnerPubkey: PublicKey | null = null;

// Fixed timestep for physics
const FIXED_TIMESTEP = 1 / 60; // 60Hz physics
let physicsAccumulator = 0;

// Reusable temp vector to reduce GC pressure
const tempVelocity = new THREE.Vector3();

// Create UI components
const loadingScreen = new LoadingScreen();
loadingScreen.setTotalSteps(5);
const homeScreen = new HomeScreen();
const notifications = new GameNotifications();

// Initialize core components
const camera = new Camera();
const scene = new Scene();
const renderer = new Renderer();
const controls = new Controls(camera.getCamera());

// Initialize physics and player
async function init() {
  try {
    loadingScreen.updateProgress('Initializing physics engine...');
    physics = new Physics();
    await physics.init();
    
    // Initialize audio system
    loadingScreen.updateProgress('Initializing audio system...');
    audioSystem = new AudioSystem(camera.getCamera());
    await audioSystem.loadSound('gunshot', '/sounds/ak47-shot.wav');
    
    // Load map with progress tracking
    await scene.setPhysics(physics, (percent, message) => {
      loadingScreen.setProgress(20 + (percent * 0.4), message);
    });
    
    loadingScreen.updateProgress('Creating player...');
    player = new Player(physics, camera.getCamera(), scene.getScene());
    
    loadingScreen.updateProgress('Loading weapon system...');
    // Wait for weapon to load (already happening in Camera constructor)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    loadingScreen.updateProgress('Finalizing...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Hide loading screen and show home screen
    loadingScreen.hide();
    
    // Wait for loading screen to fade out
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Show home screen
    homeScreen.show();
    homeScreen.onPlay(async (username: string) => {
      playerUsername = username;
      homeScreen.hide();
      
      // Try to connect to multiplayer server
      try {
        loadingScreen.show();
        loadingScreen.setProgress(50, 'Connecting to server...');
        
        networkClient = new NetworkClient();
        
        // Setup network callbacks
        networkClient.onConnected((playerId, username, gameState) => {
          localPlayerId = playerId;
          // Create health UI for local player
          healthUI = new HealthUI();
          deathOverlay = new DeathOverlay();
          scoreboard = new Scoreboard();
          // Initialize Anchor provider from Phantom if available
          try {
            const wallet = (window as any).solana;
            if (wallet && wallet.publicKey) {
              const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
              anchorProvider = getProvider(connection, wallet);
              matchOwnerPubkey = wallet.publicKey as PublicKey;
            }
          } catch (e) {
            console.warn('Anchor provider init failed:', e);
          }

          // Extract a matchId from game state if provided (roomId or matchId)
          const gsAny: any = gameState || {};
          if (typeof gsAny.roomId === 'number') currentMatchId = gsAny.roomId;
          else if (typeof gsAny.matchId === 'number') currentMatchId = gsAny.matchId;

          // If we are the owner and have provider + matchId, create the match on-chain
          if (anchorProvider && currentMatchId != null && matchOwnerPubkey) {
            // Heuristic: first player to connect in a room acts as owner
            (async () => {
              try {
                await createMatch(anchorProvider, { matchId: currentMatchId!, winPoints: 3 });
                console.log('📦 on-chain match created:', currentMatchId);
              } catch (err) {
                console.warn('createMatch failed (may already exist):', err);
              }
            })();
          }

          console.log('Connected as:', playerId, username);
          notifications.showPlayerJoined(username);

          // Apply server-assigned spawn position for local player BEFORE we start sending updates
          if (gameState?.players && gameState.players[playerId]) {
            const state = gameState.players[playerId];
            if (state?.position) {
              player.respawnAt(state.position.x, state.position.y, state.position.z);
              console.log('✅ Applied server spawn for local player:', state.position);
            }
          }
          
          // Create remote players for existing players in the game
          if (gameState?.players) {
            Object.entries(gameState.players).forEach(async ([id, playerState]) => {
              if (id !== playerId) {
                const remotePlayer = new RemotePlayer(id, playerState.username, scene.getScene());
                await remotePlayer.load();
                remotePlayers.set(id, remotePlayer);
              }
            });
          }
        });
        
        networkClient.onPlayerJoined(async (player) => {
          notifications.showPlayerJoined(player.username);
          
          // Create remote player model
          const remotePlayer = new RemotePlayer(player.id, player.username, scene.getScene());
          await remotePlayer.load();
          remotePlayers.set(player.id, remotePlayer);
          // If second player and we have provider/matchId, join on-chain
          if (anchorProvider && currentMatchId != null && matchOwnerPubkey) {
            (async () => {
              try {
                await joinMatch(anchorProvider, { matchId: currentMatchId!, owner: matchOwnerPubkey! });
                console.log('✅ on-chain joinMatch done');
              } catch (err) {
                console.warn('joinMatch failed (may already joined):', err);
              }
            })();
          }
        });
        
        networkClient.onPlayerLeft((playerId, username) => {
          notifications.showPlayerLeft(username);
          
          // Remove remote player
          const remotePlayer = remotePlayers.get(playerId);
          if (remotePlayer) {
            remotePlayer.dispose();
            remotePlayers.delete(playerId);
          }
        });
        
        networkClient.onGameState((gameState) => {
          // Update all remote players from game state (server-authoritative)
          Object.entries(gameState.players).forEach(([id, playerState]) => {
            const remotePlayer = remotePlayers.get(id);
            if (remotePlayer) {
              remotePlayer.updateState(
                playerState.position,
                playerState.rotation,
                playerState.velocity,
                playerState.alive
              );
            }
            // Update local health UI and local player enable/respawn
            if (localPlayerId && id === localPlayerId && healthUI) {
              healthUI.setHealth(playerState.health);
              if (!playerState.alive) {
                healthUI.showRespawnCountdown(GAME_CONSTANTS.RESPAWN_TIME);
                // play death animation for local model (if visible)
                const pm = player.getPlayerModel();
                if (pm) pm.playDeath();
                // disable local input
                player.setActive(false);
                localWasAlive = false;
                // show full-screen death overlay with countdown
                if (deathOverlay) deathOverlay.showCountdown(GAME_CONSTANTS.RESPAWN_TIME);
              } else {
                // If we were previously dead and now alive, apply server spawn position
                if (!localWasAlive) {
                  player.setActive(true);
                  // Snap local physics/camera to authoritative server spawn
                  player.respawnAt(
                    playerState.position.x,
                    playerState.position.y,
                    playerState.position.z
                  );
                  console.log('✅ Applied server respawn position:', playerState.position);
                }
                healthUI.clearRespawn();
                // hide overlay if visible
                if (deathOverlay) deathOverlay.hide();
                localWasAlive = true;
              }
            }
          });
        });

        networkClient.onPlayerDied((shooterId, victimId, shooterName, victimName) => {
          // reference ids to avoid unused-variable warnings
          void shooterId; void victimId;
          // Show global kill notification
          if (shooterName && victimName) notifications.showKillNotification(shooterName, victimName);

          // Attempt on-chain recordKill if we have enough context
          if (anchorProvider && currentMatchId != null && matchOwnerPubkey && shooterName && victimName) {
            try {
              const toPubkey = (s: string) => {
                try { return new PublicKey(s); } catch { return null; }
              };
              const shooterPk = toPubkey(shooterName);
              const victimPk = toPubkey(victimName);
              if (shooterPk && victimPk) {
                (async () => {
                  try {
                    await recordKill(anchorProvider, { matchId: currentMatchId!, owner: matchOwnerPubkey!, shooter: shooterPk, victim: victimPk });
                    console.log('🔫 on-chain recordKill:', shooterName, '->', victimName);
                  } catch (err) {
                    console.warn('recordKill failed:', err);
                  }
                })();
              }
            } catch (e) {
              console.warn('recordKill prep failed:', e);
            }
          }
        });

        // Listen for score updates
        networkClient.onMessage('score_update', ({ scores }: { scores: { [name: string]: number } }) => {
          if (scoreboard) scoreboard.update(scores);
        });

        networkClient.onMessage('match_won', ({ winner, scores }: { winner: string; scores: { [name: string]: number } }) => {
          if (scoreboard) {
            scoreboard.update(scores);
            scoreboard.announceWinner(winner);
          }
          notifications.showKillNotification(winner, 'won the match');

          // Finish match on-chain
          if (anchorProvider && currentMatchId != null && matchOwnerPubkey) {
            (async () => {
              try {
                await finishMatch(anchorProvider, { matchId: currentMatchId!, owner: matchOwnerPubkey! });
                console.log('🏁 on-chain finishMatch:', currentMatchId);
              } catch (err) {
                console.warn('finishMatch failed:', err);
              }
            })();
          }
        });
        
        networkClient.onPlayerShot((playerId, position, direction) => {
          // Play 3D positional gunshot sound
          const soundPos = new THREE.Vector3(position.x, position.y, position.z);
          audioSystem.playPositionalSound('gunshot', soundPos, 0.5, 100);
        });
        
        await networkClient.connect(username);
        
        loadingScreen.hide();
        gameStarted = true;
        
        // Lock pointer when game starts
        controls.lockPointer();
        
        startGame();
        
      } catch (error) {
        console.warn('Failed to connect to multiplayer server:', error);
        console.log('Starting in single-player mode');
        
        loadingScreen.hide();
        
        // Show notification for single-player
        notifications.showPlayerJoined(username);
        
        gameStarted = true;
        
        // Lock pointer when game starts
        controls.lockPointer();
        
        startGame();
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
    loadingScreen.setProgress(100, 'Error loading game. Please refresh.');
  }
}

// Start the game loop
function startGame(): void {
  renderer.instance.setAnimationLoop(animate);
  
  // Add debug command to toggle third-person view
  (window as any).toggleThirdPerson = () => {
    const currentState = player.getPlayerModel()?.getModel()?.visible || false;
    player.setModelVisible(!currentState);
    console.log(`Third-person view: ${!currentState ? 'ON (full body visible)' : 'OFF (head hidden, first-person)'}`);
  };
  
  // Add debug command to get player position and direction
  (window as any).getPlayerPos = () => {
    const pos = player.getPosition();
    const rot = player.getRotation();
    const cam = camera.getCamera();
    const direction = new THREE.Vector3();
    cam.getWorldDirection(direction);
    
    console.log('📍 Player Position:', {
      x: pos.x.toFixed(2),
      y: pos.y.toFixed(2),
      z: pos.z.toFixed(2)
    });
    console.log('🧭 Player Rotation:', {
      pitch: (rot.pitch * 180 / Math.PI).toFixed(1) + '°',
      yaw: (rot.yaw * 180 / Math.PI).toFixed(1) + '°'
    });
    console.log('➡️  Looking Direction:', {
      x: direction.x.toFixed(2),
      y: direction.y.toFixed(2),
      z: direction.z.toFixed(2)
    });
    
    return { position: pos, rotation: rot, direction };
  };
  
  console.log('💡 Debug commands:');
  console.log('  • toggleThirdPerson() - Toggle between first/third person view');
  console.log('  • getPlayerPos() - Get current position and facing direction');
  console.log('📡 Multiplayer status:');
  console.log('  • Local player: Hidden (first-person view)');
  console.log('  • Remote players: Visible with smooth interpolation');
  console.log('  • Animation states: idle, run, jump_up, jump_down, death');
}

// Animation loop
function animate(time: number): void {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  // Accumulate time for fixed physics steps
  physicsAccumulator += deltaTime;
  
  // Step physics at fixed rate (reduces CPU load)
  while (physicsAccumulator >= FIXED_TIMESTEP) {
    physics.step(FIXED_TIMESTEP);
    player.update(FIXED_TIMESTEP);
    physicsAccumulator -= FIXED_TIMESTEP;
  }
  
  // Check for shooting and trigger all effects
  if (player.shouldShoot()) {
    camera.shoot();
    controls.createRecoil();
    scene.bulletHoleManager.shootRay(camera.getCamera());
    
    // Send shoot event to server if connected
    if (networkClient) {
      const cameraPos = camera.getCamera().position;
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.getCamera().quaternion);
      
      networkClient.sendShoot(
        { x: cameraPos.x, y: cameraPos.y, z: cameraPos.z },
        { x: direction.x, y: direction.y, z: direction.z }
      );
    }
  }
  
  // Update camera recoil recovery
  controls.updateRecoil();
  
  // Update scene
  scene.update();
  
  // Update bullet holes
  scene.bulletHoleManager.update();
  
  // Update remote players
  remotePlayers.forEach(remotePlayer => {
    remotePlayer.update(deltaTime);
  });
  
  // Send player position update to server (throttle to ~20 updates/sec)
  if (networkClient && Math.random() < 0.33) { // ~20Hz at 60fps
    const playerPos = player.getPosition();
    const playerRot = player.getRotation();
    tempVelocity.copy(player.getVelocity());
    
    networkClient.sendPlayerUpdate(
      { x: playerPos.x, y: playerPos.y, z: playerPos.z },
      playerRot,
      { x: tempVelocity.x, y: tempVelocity.y, z: tempVelocity.z }
    );
  }
  
  // Calculate if player is moving (use temp vector to reduce GC)
  tempVelocity.copy(player.getVelocity());
  const isMoving = Math.sqrt(tempVelocity.x * tempVelocity.x + tempVelocity.z * tempVelocity.z) > 0.1;
  
  // Update weapon with all parameters
  camera.updateWeapon(deltaTime, tempVelocity, isMoving, controls.rotationDelta);
  
  // Reset rotation delta after using it
  controls.resetRotationDelta();
  
  // Render main scene
  renderer.render(scene.getScene(), camera.getCamera());
  
  // Render weapon on top
  renderer.renderWeapon(camera.viewmodelRenderer.scene, camera.viewmodelRenderer.camera);
}

// Start the game
init();