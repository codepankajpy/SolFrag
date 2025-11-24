import * as THREE from 'three';
import { Camera } from './core/Camera';
import { Scene } from './core/Scene';
import { Renderer } from './core/Renderer';
import { Controls } from './core/Controls';
import { Physics } from './physics/Physics';
import { Player } from './player/Player';
import { LoadingScreen } from './ui/LoadingScreen';
import { HomeScreen } from './ui/HomeScreen';
import { GameNotifications } from './ui/GameNotifications';
import { NetworkClient } from './network/NetworkClient';
import { AudioSystem } from './audio/AudioSystem';

let player: Player;
let physics: Physics;
let lastTime = 0;
let gameStarted = false;
let playerUsername = '';
let networkClient: NetworkClient;
let audioSystem: AudioSystem;

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
    player = new Player(physics, camera.getCamera());
    
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
          console.log('Connected as:', playerId, username);
          notifications.showPlayerJoined(username);
        });
        
        networkClient.onPlayerJoined((player) => {
          notifications.showPlayerJoined(player.username);
        });
        
        networkClient.onPlayerLeft((playerId, username) => {
          notifications.showPlayerLeft(username);
        });
        
        networkClient.onPlayerShot((playerId, position, direction) => {
          // Play 3D positional gunshot sound
          const soundPos = new THREE.Vector3(position.x, position.y, position.z);
          audioSystem.playPositionalSound('gunshot', soundPos, 0.5, 100);
        });
        
        await networkClient.connect(username);
        
        loadingScreen.hide();
        gameStarted = true;
        startGame();
        
      } catch (error) {
        console.warn('Failed to connect to multiplayer server:', error);
        console.log('Starting in single-player mode');
        
        loadingScreen.hide();
        
        // Show notification for single-player
        notifications.showPlayerJoined(username);
        
        gameStarted = true;
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