import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Weapon {
  private model: THREE.Group | null = null;
  private weaponScene: THREE.Scene;
  private weaponCamera: THREE.PerspectiveCamera;
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
    
    // Create separate scene and camera for weapon
    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    
    // Add light to weapon scene
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(1, 1, 1);
    this.weaponScene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.weaponScene.add(ambientLight);
  }

  public async loadWeapon(path: string): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(path);
      this.model = gltf.scene;

      // Position weapon for FPS view - bottom right
      // The weapon is positioned in local space relative to the camera
      this.model.position.set(0.4, -0.3, -0.6);
      
      // Rotate weapon to point forward (toward crosshair)
      // Adjust rotation so barrel points along camera's forward direction (-Z axis)
      this.model.rotation.set(0, Math.PI / 2, 0);
      
      this.model.scale.set(0.08, 0.08, 0.08);

      // Add to weapon scene
      this.weaponScene.add(this.model);

      console.log('✓ Weapon loaded into FPS view');
      console.log('  Position relative to camera:', this.model.position);
      console.log('  Rotation:', this.model.rotation);
    } catch (error) {
      console.error('Failed to load weapon:', path, error);
    }
  }

  public render(renderer: THREE.WebGLRenderer, mainCamera: THREE.PerspectiveCamera): void {
    if (!this.model) return;

    // Only sync rotation with main camera, NOT position
    // The weapon stays at origin (0,0,0) in its own scene
    // This makes it follow the camera's look direction while staying visible
    this.weaponCamera.rotation.copy(mainCamera.rotation);
    this.weaponCamera.quaternion.copy(mainCamera.quaternion);

    // Render weapon scene on top without clearing
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.weaponScene, this.weaponCamera);
    renderer.autoClear = true;
  }

  public onResize(): void {
    this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera.updateProjectionMatrix();
  }

  public getModel(): THREE.Group | null {
    return this.model;
  }

  public setPosition(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  public setRotation(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.rotation.set(x, y, z);
    }
  }

  public setScale(scale: number): void {
    if (this.model) {
      this.model.scale.set(scale, scale, scale);
    }
  }
}
