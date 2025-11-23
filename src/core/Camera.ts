import * as THREE from 'three';
import { ViewmodelRenderer } from '../view/ViewmodelRenderer';
import { WeaponSystem } from '../weapon/WeaponSystem';
import { AudioManager } from '../audio/AudioManager';

export class Camera {
  public instance: THREE.PerspectiveCamera;
  public viewmodelRenderer: ViewmodelRenderer;
  public weaponSystem: WeaponSystem;
  public audioManager: AudioManager;
  private weaponLoaded = false;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.instance = new THREE.PerspectiveCamera(70, width / height, 0.01, 100);
    this.instance.position.set(0, 0, 0);

    // Create viewmodel renderer for weapon
    this.viewmodelRenderer = new ViewmodelRenderer(60);
    
    // Create weapon system
    this.weaponSystem = new WeaponSystem();
    
    // Create audio manager
    this.audioManager = new AudioManager(this.instance);

    window.addEventListener('resize', this.onResize.bind(this));
    
    // Load weapon, arms, and sounds
    this.loadWeaponSystem();
  }
  
  private async loadWeaponSystem(): Promise<void> {
    // Load weapon sound
    await this.audioManager.loadSound('ak47-shot', '/sounds/ak47-shot.wav');
    
    // Load weapon (arms are included in the FPS weapon model)
    await this.weaponSystem.loadWeapon(
      '/models/AssaultRifle_2.glb',
      new THREE.Vector3(0.15, -0.12, -0.15)
    );
    
    if (this.weaponSystem.weaponMesh) {
      this.viewmodelRenderer.addWeapon(this.weaponSystem.weaponMesh.mesh);
      this.weaponSystem.initPosition();
      
      // Add muzzle flash to viewmodel scene
      const muzzleFlash = this.weaponSystem.getMuzzleFlash();
      if (muzzleFlash) {
        this.viewmodelRenderer.addWeapon(muzzleFlash);
      }
      
      this.weaponLoaded = true;
      console.log('Weapon system loaded completely');
    }
  }

  /**
   * Update weapon with all effects
   */
  public updateWeapon(
    deltaTime: number,
    playerVelocity: THREE.Vector3,
    isMoving: boolean,
    rotationDelta: { x: number; y: number }
  ): void {
    if (!this.weaponLoaded) return;
    
    // Sync viewmodel camera rotation with main camera
    this.viewmodelRenderer.syncWithCamera(this.instance);
    
    // Update weapon system
    this.weaponSystem.update(deltaTime, playerVelocity, isMoving, rotationDelta);
  }

  /**
   * Trigger weapon shoot with all effects
   */
  public shoot(): void {
    if (!this.weaponLoaded) return;
    
    // Play shoot animation
    this.weaponSystem.shoot();
    
    // Play sound
    this.audioManager.playSound('ak47-shot', 0.3);
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
