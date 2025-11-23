import * as THREE from 'three';
import { FPSMesh } from './FPSMesh';

/**
 * Complete weapon system with arms, animations, bobbing, and recoil
 * Based on enari-engine's FPSRenderer pattern
 */
export class WeaponSystem {
  public weaponMesh?: FPSMesh;
  public armsMesh?: FPSMesh;
  
  // Weapon positioning
  public weaponOffset = new THREE.Vector3(0.2, -0.15, -0.25);
  public weaponRotation = new THREE.Vector3(Math.PI, Math.PI * 0.5, 0);
  
  // Bobbing state
  private bobbingAmount = 0.001;
  private bobbingRestitutionSpeed = 15;
  private weaponBobbingAcc = new THREE.Vector3(0, 0, 0);
  private moveEffect = new THREE.Vector3(0, 0, 0);
  
  // Recoil state
  private recoilEffect = 0;
  private recoilRecoverySpeed = 5;
  
  // Switch animation
  private switchVelocity = 0;

  constructor() {}

  /**
   * Load weapon mesh
   */
  public async loadWeapon(path: string, viewmodelOffset?: THREE.Vector3): Promise<void> {
    this.weaponMesh = new FPSMesh(path, viewmodelOffset);
    await this.weaponMesh.load();
  }

  /**
   * Load arms mesh
   */
  public async loadArms(path: string): Promise<void> {
    this.armsMesh = new FPSMesh(path);
    await this.armsMesh.load();
  }

  /**
   * Initialize weapon position
   */
  public initPosition(): void {
    if (this.weaponMesh) {
      this.weaponMesh.mesh.position.add(this.weaponOffset);
      this.weaponMesh.mesh.position.add(this.weaponMesh.viewmodelOffset);
    }
    if (this.armsMesh && this.armsMesh.mesh) {
      this.armsMesh.mesh.position.add(this.weaponOffset);
    }
  }

  /**
   * Update weapon animations and effects
   */
  public update(deltaTime: number, playerVelocity: THREE.Vector3, isMoving: boolean, rotationDelta: { x: number; y: number }): void {
    if (!this.weaponMesh) return;

    // Update animations
    this.weaponMesh.update(deltaTime);
    if (this.armsMesh && this.armsMesh.mesh) {
      this.armsMesh.update(deltaTime);
    }

    // Apply rotation bobbing if camera is rotating
    if (rotationDelta.x !== 0 || rotationDelta.y !== 0) {
      const rotationBobbing = new THREE.Vector2(rotationDelta.x, rotationDelta.y).multiplyScalar(this.bobbingAmount);
      this.weaponBobbingAcc.add(new THREE.Vector3(rotationBobbing.y, rotationBobbing.x, 0));
    }

    // Calculate bobbing restitution
    const bobbingLerpAmount = Math.min(1, this.bobbingRestitutionSpeed * deltaTime);
    this.weaponBobbingAcc.x = this.lerp(this.weaponBobbingAcc.x, 0, bobbingLerpAmount);
    this.weaponBobbingAcc.y = this.lerp(this.weaponBobbingAcc.y, 0, bobbingLerpAmount);
    this.weaponBobbingAcc.z = this.lerp(this.weaponBobbingAcc.z, 0, bobbingLerpAmount);

    // Update weapon rotation with bobbing
    this.weaponMesh.mesh.rotation.x = -this.weaponBobbingAcc.x + this.weaponRotation.x;
    this.weaponMesh.mesh.rotation.y = -this.weaponBobbingAcc.y + this.weaponRotation.y;
    this.weaponMesh.mesh.rotation.z = -this.weaponBobbingAcc.z + this.weaponRotation.z;

    // Apply movement bobbing
    if (isMoving) {
      this.moveEffect.y += deltaTime * 10;
    }
    const bobbingAmount = Math.sin(this.moveEffect.y) * this.bobbingAmount;
    
    // Update weapon position
    this.weaponMesh.mesh.position.x = this.weaponOffset.x + this.weaponMesh.viewmodelOffset.x;
    this.weaponMesh.mesh.position.y = this.weaponOffset.y + this.weaponMesh.viewmodelOffset.y + bobbingAmount + Math.sin(this.moveEffect.y) / 50;
    this.weaponMesh.mesh.position.z = this.weaponOffset.z + this.weaponMesh.viewmodelOffset.z + this.recoilEffect;

    // Update recoil recovery
    if (this.recoilEffect > 0) {
      this.recoilEffect -= deltaTime / 2;
      this.recoilEffect = Math.max(0, this.recoilEffect);
    }

    // Update switch animation
    this.switchVelocity += deltaTime * 4;
    if (this.switchVelocity >= -this.weaponOffset.y / 2) {
      this.switchVelocity -= deltaTime * 4;
      this.switchVelocity = Math.max(0, this.switchVelocity);
    }

    // Sync arms with weapon
    if (this.armsMesh && this.armsMesh.mesh) {
      this.armsMesh.mesh.position.copy(this.weaponMesh.mesh.position);
      this.armsMesh.mesh.rotation.copy(this.weaponMesh.mesh.rotation);
    }
  }

  /**
   * Trigger shoot effects
   */
  public shoot(): void {
    if (this.weaponMesh) {
      this.weaponMesh.playAnimation('Shoot');
    }
    this.recoilEffect = 0.1;
  }

  /**
   * Trigger reload animation
   */
  public reload(): void {
    if (this.weaponMesh) {
      this.weaponMesh.playAnimation('Reload');
    }
  }

  /**
   * Trigger weapon switch animation
   */
  public switchWeapon(): void {
    this.switchVelocity = 0.05;
    if (this.weaponMesh) {
      this.weaponMesh.playAnimation('Switch');
    }
  }

  /**
   * Linear interpolation helper
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
}
