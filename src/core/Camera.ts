import * as THREE from 'three';
import { ViewmodelRenderer } from '../view/ViewmodelRenderer';
import { Weapon } from '../weapon/Weapon';

export class Camera {
  public instance: THREE.PerspectiveCamera;
  public viewmodelRenderer: ViewmodelRenderer;
  public weapon: Weapon;
  private weaponLoaded = false;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.instance = new THREE.PerspectiveCamera(70, width / height, 0.01, 100);
    this.instance.position.set(0, 0, 0);

    // Create viewmodel renderer for weapon
    this.viewmodelRenderer = new ViewmodelRenderer(60);
    
    // Create weapon instance
    this.weapon = new Weapon();

    window.addEventListener('resize', this.onResize.bind(this));
    
    // Load weapon model
    this.loadWeapon();
  }
  
  private async loadWeapon(): Promise<void> {
    // Load weapon
    await this.weapon.load('/models/AssaultRifle_2.glb');
    
    if (this.weapon.mesh) {
      // Add weapon to viewmodel camera (as child)
      this.viewmodelRenderer.addWeapon(this.weapon.mesh);
      this.weaponLoaded = true;
      console.log('Weapon loaded and added to viewmodel camera');
    }
  }

  /**
   * Update weapon position and sync viewmodel camera with main camera
   */
  public updateWeapon(deltaTime: number, playerVelocity: THREE.Vector3, isOnGround: boolean): void {
    if (!this.weaponLoaded) return;
    
    // Sync viewmodel camera rotation with main camera
    this.viewmodelRenderer.syncWithCamera(this.instance);
    
    // Update weapon bobbing and animations
    this.weapon.update(deltaTime, playerVelocity, isOnGround);
  }

  /**
   * Add rotation-based bobbing to weapon
   */
  public addWeaponRotationBobbing(rotationDelta: { x: number; y: number }): void {
    if (this.weaponLoaded) {
      this.weapon.addRotationBobbing(rotationDelta);
    }
  }

  /**
   * Trigger weapon recoil effect
   */
  public triggerWeaponRecoil(amount: number = 0.05): void {
    if (this.weaponLoaded) {
      this.weapon.triggerRecoil(amount);
    }
  }

  private onResize(): void {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
    this.viewmodelRenderer.onResize();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.instance;
  }
}
