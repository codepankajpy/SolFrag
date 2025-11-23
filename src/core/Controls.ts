import * as THREE from 'three';

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private isLocked: boolean = false;
  private euler: THREE.Euler;
  private sensitivity: number = 0.002;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    
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

      this.euler.setFromQuaternion(this.camera.quaternion);
      
      this.euler.y -= movementX * this.sensitivity;
      this.euler.x -= movementY * this.sensitivity;
      
      // Clamp vertical rotation to prevent gimbal lock
      this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
      
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  public isPointerLocked(): boolean {
    return this.isLocked;
  }
}
