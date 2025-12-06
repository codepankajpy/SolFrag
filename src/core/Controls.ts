import * as THREE from 'three';
import { Crosshair } from '../ui/Crosshair';

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private isLocked: boolean = false;
  private gameActive: boolean = false; // Track if game is running
  private euler: THREE.Euler;
  private sensitivity: number = 0.002;
  private crosshair: Crosshair;
  
  // Track rotation delta for weapon bobbing
  public rotationDelta = { x: 0, y: 0 };
  public isRotating = false;
  
  // Camera recoil system (enari-engine pattern)
  private recoilIndex = 1;
  private yawDirection = -1;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.crosshair = new Crosshair();
    
    this.setupPointerLock();
    this.setupMouseMovement();
  }

  private setupPointerLock(): void {
    // Add click listener to re-lock pointer when game is active
    document.addEventListener('click', () => {
      if (this.gameActive && !this.isLocked) {
        document.body.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
      
      // Hide/show cursor based on pointer lock
      if (this.isLocked) {
        document.body.style.cursor = 'none';
        this.crosshair.show();
      } else {
        document.body.style.cursor = 'default';
        this.crosshair.hide();
      }
    });

    document.addEventListener('pointerlockerror', () => {
      console.error('Pointer lock error');
    });
  }

  /**
   * Request pointer lock (called when game starts)
   */
  public lockPointer(): void {
    this.gameActive = true; // Mark game as active
    if (!this.isLocked) {
      document.body.requestPointerLock();
    }
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
      
      // Clamp vertical rotation to 85 degrees up/down to prevent flipping
      const maxPitch = (85 * Math.PI) / 180; // 85 degrees in radians
      this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
      
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

  /**
   * Check if can reset recoil (for smooth recovery)
   */
  public canResetRecoil(): boolean {
    return this.recoilIndex > 1;
  }

  /**
   * Create camera recoil effect (enari-engine pattern)
   */
  public createRecoil(): void {
    this.yawDirection = Math.random() <= 0.1 ? -this.yawDirection : this.yawDirection;

    // Pitch damping function
    const pitchDampingFunction = (x: number): number => {
      const c = 1.2;
      return c * x * Math.exp(1 - c * x);
    };

    // Yaw damping function
    const yawDampingFunction = (x: number): number => {
      const c = 0.6;
      let x2 = 5 - (x % 5);
      return c * x2 * Math.exp(1 - c * x2);
    };

    const pitch = pitchDampingFunction(this.recoilIndex / 2) / 30;
    const yaw = (yawDampingFunction(this.recoilIndex) / 50) * this.yawDirection;

    // Apply recoil to camera with pitch clamping
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.x += pitch;
    this.euler.y += yaw;
    
    // Clamp to 85 degrees to prevent camera flip
    const maxPitch = (85 * Math.PI) / 180;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
    
    this.camera.quaternion.setFromEuler(this.euler);
    
    this.recoilIndex++;
  }

  /**
   * Update recoil recovery
   */
  public updateRecoil(): void {
    if (this.canResetRecoil() && this.recoilIndex > 1) {
      this.recoilIndex--;
    }
  }

  public isPointerLocked(): boolean {
    return this.isLocked;
  }
}
