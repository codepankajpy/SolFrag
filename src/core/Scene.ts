import * as THREE from 'three';
import { Physics } from '../physics/Physics';
import { MapLoader } from '../game/MapLoader';
import { BulletHoleManager } from '../effects/BulletHoleManager';

export class Scene {
  public instance: THREE.Scene;
  private physics: Physics | null = null;
  private groundBody: any = null;
  private mapLoader: MapLoader | null = null;
  private mapLoaded: boolean = false;
  public bulletHoleManager: BulletHoleManager;

  constructor() {
    this.instance = new THREE.Scene();
    this.setupScene();
    this.bulletHoleManager = new BulletHoleManager(this.instance);
  }

  public async setPhysics(physics: Physics): Promise<void> {
    this.physics = physics;
    this.mapLoader = new MapLoader(physics);
    
    // Try to load the invasion map
    const map = await this.mapLoader.loadMap('/models/invasion.glb');
    
    if (map) {
      this.instance.add(map);
      this.mapLoaded = true;
      console.log('Invasion map loaded successfully');
    } else {
      // Fallback to basic scene with colliders
      console.log('Using fallback scene');
      this.addGroundCollider();
    }
  }

  private addGroundCollider(): void {
    if (!this.physics) return;
    
    const world = this.physics.getWorld();
    const rapier = this.physics.getRapier();
    
    if (!world || !rapier) return;

    // Create static rigid body for ground
    const groundBodyDesc = rapier.RigidBodyDesc.fixed()
      .setTranslation(0, -1, 0);
    
    this.groundBody = world.createRigidBody(groundBodyDesc);

    // Create box collider for ground (20x20 plane)
    const groundColliderDesc = rapier.ColliderDesc.cuboid(10, 0.1, 10);
    world.createCollider(groundColliderDesc, this.groundBody);

    // Add colliders for cubes
    const cubePositions = [
      { x: 0, y: 0, z: -3 },
      { x: 2, y: 0, z: -4 },
      { x: -2, y: 0, z: -5 },
      { x: 1, y: 0.5, z: -2 },
      { x: -1, y: 0, z: -6 },
      { x: 3, y: 0, z: -3 },
      { x: -3, y: 0, z: -4 },
      { x: 0, y: 1, z: -7 },
    ];

    cubePositions.forEach((pos) => {
      const cubeBodyDesc = rapier.RigidBodyDesc.fixed()
        .setTranslation(pos.x, pos.y, pos.z);
      const cubeBody = world.createRigidBody(cubeBodyDesc);
      const cubeColliderDesc = rapier.ColliderDesc.cuboid(0.25, 0.25, 0.25);
      world.createCollider(cubeColliderDesc, cubeBody);
    });
  }

  private setupScene(): void {
    // Add sky
    this.instance.background = new THREE.Color(0x87CEEB);
    this.instance.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.instance.add(ambientLight);

    // Add directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.instance.add(directionalLight);

    // Add fallback ground (will be visible if map doesn't load)
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d5016,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    ground.name = 'fallback-ground';
    this.instance.add(ground);

    // Add fallback cubes
    const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    
    const positions = [
      { x: 0, y: 0, z: -3 },
      { x: 2, y: 0, z: -4 },
      { x: -2, y: 0, z: -5 },
      { x: 1, y: 0.5, z: -2 },
      { x: -1, y: 0, z: -6 },
      { x: 3, y: 0, z: -3 },
      { x: -3, y: 0, z: -4 },
      { x: 0, y: 1, z: -7 },
    ];

    positions.forEach((pos) => {
      const material = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff,
        roughness: 0.7,
        metalness: 0.3
      });
      const cube = new THREE.Mesh(cubeGeometry, material);
      cube.position.set(pos.x, pos.y, pos.z);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.name = 'fallback-cube';
      this.instance.add(cube);
    });
  }

  public getScene(): THREE.Scene {
    return this.instance;
  }

  public update(): void {
    // Scene updates can be added here
  }
}
