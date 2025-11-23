import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Weapon class handles loading, positioning, and animating the player's weapon.
 * Includes bobbing effects for movement and recoil simulation.
 */
export class Weapon {
  public mesh: THREE.Group | null = null;
  private loader: GLTFLoader;
  
  // Base position and rotation (relative to camera)
  public basePosition = new THREE.Vector3(0.15, -0.12, -0.15);
  public baseRotation = new THREE.Euler(0, Math.PI * 0.5, 0);
  
  // Weapon bobbing state
  private bobbingAmount = 0.001; // Reduced to half (was 0.002)
  private bobbingSpeed = 10;
  private bobbingAccumulator = new THREE.Vector3(0, 0, 0);
  private moveTime = 0;
  
  // Recoil state
  private recoilOffset = 0;
  private recoilRecoverySpeed = 5;
  
  // Movement tracking
  private isMoving = false;
  private velocity = new THREE.Vector3();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load a weapon model from a GLTF file
   */
  public async load(modelPath: string): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(modelPath);
      this.mesh = gltf.scene;
      
      // Configure weapon mesh
      this.mesh.scale.set(0.15, 0.15, 0.15);
      this.mesh.position.copy(this.basePosition);
      this.mesh.rotation.copy(this.baseRotation);
      
      // Prevent depth issues and disable shadows
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.frustumCulled = false;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      
      console.log('Weapon loaded successfully:', modelPath);
    } catch (error) {
      console.error('Error loading weapon:', error);
    }
  }

  /**
   * Update weapon position and rotation based on movement and time
   */
  public update(deltaTime: number, playerVelocity: THREE.Vector3, isOnGround: boolean): void {
    if (!this.mesh) return;

    // Track movement
    this.velocity.copy(playerVelocity);
    const speed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
    this.isMoving = speed > 0.1 && isOnGround;

    // Update bobbing with reduced intensity
    this.updateBobbing(deltaTime);
    
    // Update recoil recovery
    this.updateRecoil(deltaTime);
    
    // Apply transformations
    this.applyTransformations();
  }

  /**
   * Update weapon bobbing based on movement
   */
  private updateBobbing(deltaTime: number): void {
    if (this.isMoving) {
      // Increment move time for sine wave motion
      this.moveTime += deltaTime * this.bobbingSpeed;
      
      // Calculate bobbing offsets
      const horizontalBob = Math.sin(this.moveTime) * this.bobbingAmount;
      const verticalBob = Math.sin(this.moveTime * 2) * this.bobbingAmount * 0.5;
      
      // Apply to accumulator
      this.bobbingAccumulator.x = horizontalBob;
      this.bobbingAccumulator.y = verticalBob;
    } else {
      // Smoothly return to rest position
      this.bobbingAccumulator.lerp(new THREE.Vector3(0, 0, 0), deltaTime * 5);
      this.moveTime = 0;
    }
  }

  /**
   * Update recoil recovery
   */
  private updateRecoil(deltaTime: number): void {
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - deltaTime * this.recoilRecoverySpeed);
    }
  }

  /**
   * Apply all transformations to weapon mesh
   */
  private applyTransformations(): void {
    if (!this.mesh) return;

    // Apply base position + bobbing + recoil
    this.mesh.position.set(
      this.basePosition.x + this.bobbingAccumulator.x,
      this.basePosition.y + this.bobbingAccumulator.y,
      this.basePosition.z + this.bobbingAccumulator.z - this.recoilOffset
    );

    // Apply rotation with bobbing
    this.mesh.rotation.set(
      this.baseRotation.x - this.bobbingAccumulator.y * 2,
      this.baseRotation.y + this.bobbingAccumulator.x * 2,
      this.baseRotation.z - this.bobbingAccumulator.x
    );
  }

  /**
   * Trigger recoil effect (accumulates for rapid fire)
   */
  public triggerRecoil(amount: number = 0.05): void {
    this.recoilOffset += amount; // Accumulate recoil
    this.recoilOffset = Math.min(this.recoilOffset, 0.2); // Cap max recoil
  }

  /**
   * Add weapon bobbing from camera rotation
   */
  public addRotationBobbing(rotationDelta: { x: number; y: number }): void {
    if (!this.mesh) return;
    
    // Reduced sensitivity to half
    const sensitivity = 0.0005; // Was 0.001
    this.bobbingAccumulator.x += rotationDelta.x * sensitivity;
    this.bobbingAccumulator.y += rotationDelta.y * sensitivity;
  }

  /**
   * Add weapon bobbing from jump/fall
   */
  public addJumpBobbing(verticalVelocity: number): void {
    if (!this.mesh) return;
    
    const jumpEffect = Math.max(-0.05, verticalVelocity / 5000);
    this.bobbingAccumulator.x += jumpEffect;
  }

  /**
   * Set base weapon position
   */
  public setPosition(x: number, y: number, z: number): void {
    this.basePosition.set(x, y, z);
  }

  /**
   * Set base weapon rotation
   */
  public setRotation(x: number, y: number, z: number): void {
    this.baseRotation.set(x, y, z);
  }

  /**
   * Set weapon scale
   */
  public setScale(scale: number): void {
    if (this.mesh) {
      this.mesh.scale.set(scale, scale, scale);
    }
  }
}
