import { Camera } from './core/Camera';
import { Scene } from './core/Scene';
import { Renderer } from './core/Renderer';
import { Controls } from './core/Controls';
import { Physics } from './physics/Physics';
import { Player } from './player/Player';

let player: Player;
let physics: Physics;
let lastTime = 0;

// Initialize core components
const camera = new Camera();
const scene = new Scene();
const renderer = new Renderer();
const controls = new Controls(camera.getCamera());

// Initialize physics and player
async function init() {
  physics = new Physics();
  await physics.init();
  
  // Setup physics for scene (will try to load map)
  await scene.setPhysics(physics);
  
  // Create player
  player = new Player(physics, camera.getCamera());
  
  // Start animation loop
  renderer.instance.setAnimationLoop(animate);
}

// Animation loop
function animate(time: number): void {
  const deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  // Update physics
  physics.step(deltaTime);
  
  // Update player
  player.update(deltaTime);
  
  // Update scene
  scene.update();
  
  // Render
  renderer.render(scene.getScene(), camera.getCamera());
}

// Start the game
init();