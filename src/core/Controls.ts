import * as THREE from 'three';
import { Crosshair } from '../ui/Crosshair';

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private isLocked: boolean = false;
  private euler: THREE.Euler;
  private sensitivity: number = 0.002;
  private crosshair: Crosshair;
  
  // Track rotation delta for weapon bobbing
  public rotationDelta = { x: 0, y: 0 };
  public isRotating = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.crosshair = new Crosshair();
    
    this.setupPointerLock();
    this.setupMouseMovement();
  }

  private setupPointerLock(): void {
    document.addEventListener('click', () => {
      if (!this.isLocked) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
      
      // Show/hide crosshair based on pointer lock
      if (this.isLocked) {
        this.crosshair.show();
      } else {
        this.crosshair.hide();
      }
    });

    document.addEventListener('pointerlockerror', () => {
      console.error('Pointer lock error');
    });
  }

  private setupMouseMovement(): void {
    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this.isLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      // Track rotation delta for weapon bobbing
      this.rotationDelta.x = movementX;
      this.rotationDelta.y = movementY;
      this.isRotating = Math.abs(movementX) > 0 || Math.abs(movementY) > 0;

      this.euler.setFromQuaternion(this.camera.quaternion);
      
      this.euler.y -= movementX * this.sensitivity;
      this.euler.x -= movementY * this.sensitivity;
      
      // Clamp vertical rotation to prevent gimbal lock (max 90 degrees up/down)
      const PI_2 = Math.PI / 2;
      this.euler.x = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, this.euler.x));
      
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }
  
  /**
   * Reset rotation delta (call this after using it for weapon bobbing)
   */
  public resetRotationDelta(): void {
    this.rotationDelta.x = 0;
    this.rotationDelta.y = 0;
    this.isRotating = false;
  }

  public isPointerLocked(): boolean {
    return this.isLocked;
  }
}
