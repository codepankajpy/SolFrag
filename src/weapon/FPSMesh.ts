import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * FPSMesh handles loading and animating FPS weapon models
 * Inspired by enari-engine's implementation
 */
export class FPSMesh {
  public mesh!: THREE.Group;
  public animations: THREE.AnimationClip[] = [];
  private mixer?: THREE.AnimationMixer;
  private currentAction?: THREE.AnimationAction;
  private loader: GLTFLoader;
  private path: string;
  public viewmodelOffset: THREE.Vector3;

  constructor(path: string, viewmodelOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.path = path;
    this.viewmodelOffset = viewmodelOffset;
    this.loader = new GLTFLoader();
  }

  /**
   * Load the GLTF model
   */
  public async load(): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(this.path);
      this.mesh = gltf.scene;
      this.animations = gltf.animations;
      this.init();
      console.log('FPS Mesh loaded:', this.path);
    } catch (error) {
      console.error('Error loading FPS mesh:', error);
      throw error; // Re-throw to let caller handle it
    }
  }

  /**
   * Initialize the mesh (flip scale like enari-engine)
   */
  private init(): void {
    // Flip the mesh by multiplying scale by -1, with smaller scale (0.25)
    this.mesh.scale.set(-0.25, -0.25, -0.25);
    
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
      }
    });

    // Setup animation mixer if animations exist
    if (this.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
    }
  }

  /**
   * Play an animation by name
   */
  public playAnimation(name: string, loop: boolean = false): void {
    if (!this.mixer) return;

    const clip = this.animations.find(clip => clip.name.toLowerCase().includes(name.toLowerCase()));
    if (!clip) {
      console.warn(`Animation "${name}" not found`);
      return;
    }

    // Stop current animation
    if (this.currentAction) {
      this.currentAction.stop();
    }

    // Play new animation
    this.currentAction = this.mixer.clipAction(clip);
    this.currentAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    this.currentAction.clampWhenFinished = true;
    this.currentAction.reset();
    this.currentAction.play();
  }

  /**
   * Update animation mixer
   */
  public update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  /**
   * Get the muzzle flash position (for particle effects)
   */
  public getMuzzlePosition(): THREE.Vector3 {
    // Try to find a bone or object named "muzzle" or similar
    let muzzle: THREE.Object3D | undefined;
    this.mesh.traverse((child) => {
      const name = child.name.toLowerCase();
      if (name.includes('muzzle') || name.includes('flash')) {
        muzzle = child;
      }
    });

    if (muzzle) {
      const worldPos = new THREE.Vector3();
      muzzle.getWorldPosition(worldPos);
      return worldPos;
    }

    // Default to front of weapon
    return this.mesh.position.clone().add(new THREE.Vector3(0, 0, -0.5));
  }
}
