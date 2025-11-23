import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class HandWeapon {
  private model: THREE.Group | null = null;
  private loader: GLTFLoader;
  private handBone: THREE.Object3D | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async loadWeapon(path: string): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(path);
      this.model = gltf.scene;

      console.log('✓ Hand weapon loaded successfully');
    } catch (error) {
      console.error('Failed to load hand weapon:', path, error);
    }
  }

  public attachToHand(handBone: THREE.Object3D): void {
    if (!this.model || !handBone) {
      console.error('Cannot attach weapon: model or hand bone is null');
      console.log('Model:', this.model);
      console.log('Hand bone:', handBone);
      return;
    }

    this.handBone = handBone;
    
    // Position and rotate weapon relative to hand
    // Start with neutral position and adjust from there
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);

    // Attach weapon to hand bone
    handBone.add(this.model);
    
    // Force weapon to be visible even if parent character is hidden
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
        child.frustumCulled = false; // Ensure it's always rendered
      }
    });

    console.log('✓ Weapon attached to hand bone:', handBone.name);
    console.log('  Weapon local position:', this.model.position);
    console.log('  Weapon local rotation:', this.model.rotation);
    console.log('  Weapon local scale:', this.model.scale);
    console.log('  Hand bone has', handBone.children.length, 'children');
  }

  public adjustWeaponTransform(position: THREE.Vector3, rotation: THREE.Euler, scale: number): void {
    if (this.model) {
      this.model.position.copy(position);
      this.model.rotation.copy(rotation);
      this.model.scale.set(scale, scale, scale);
      
      // Ensure weapon remains visible
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
        }
      });
      
      console.log('Weapon transform adjusted:', {
        position: this.model.position,
        rotation: this.model.rotation,
        scale: this.model.scale
      });
    }
  }

  public getModel(): THREE.Group | null {
    return this.model;
  }
}
