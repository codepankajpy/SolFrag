import * as THREE from 'three';
import { Camera } from './core/Camera';
import { Scene } from './core/Scene';
import { Renderer } from './core/Renderer';
import { Controls } from './core/Controls';
import { Physics } from './physics/Physics';
import { Player } from './player/Player';
import { LoadingScreen } from './ui/LoadingScreen';
import { HomeScreen } from './ui/HomeScreen';

let player: Player;
let physics: Physics;
let lastTime = 0;
let gameStarted = false;

// Fixed timestep for physics
const FIXED_TIMESTEP = 1 / 60; // 60Hz physics
let physicsAccumulator = 0;

// Reusable temp vector to reduce GC pressure
const tempVelocity = new THREE.Vector3();

// Create loading screen and home screen
const loadingScreen = new LoadingScreen();
loadingScreen.setTotalSteps(5); // Define total loading steps
const homeScreen = new HomeScreen();

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
    homeScreen.onPlay(() => {
      homeScreen.hide();
      gameStarted = true;
      startGame();
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