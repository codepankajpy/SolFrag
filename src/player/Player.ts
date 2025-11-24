import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Physics } from '../physics/Physics';
import { PlayerModel } from './PlayerModel';

export class Player {
  // Player specifications
  private readonly HEIGHT = 1.8;
  private readonly RADIUS = 0.3;
  private readonly CAMERA_HEIGHT = 1.65;
  private readonly WALK_SPEED = 6.864; // Increased by 10% from 6.24
  private readonly JUMP_HEIGHT = 1.1;
  
  // Physics
  private physics: Physics;
  private rigidBody: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;
  
  // Camera
  private camera: THREE.PerspectiveCamera;
  
  // Player model
  private playerModel?: PlayerModel;
  private scene?: THREE.Scene;
  private showModel: boolean = true; // Show model but hide head in first-person
  
  // Movement state
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private canJump = false;
  private jumpKeyPressed = false; // Track if space is being held
  
  // Shooting state
  private isShooting = false;
  private lastShotTime = 0;
  private fireRate = 100; // milliseconds between shots
  
  // Movement direction
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();

  constructor(physics: Physics, camera: THREE.PerspectiveCamera, scene?: THREE.Scene) {
    this.physics = physics;
    this.camera = camera;
    this.scene = scene;
    
    this.init();
  }

  /**
   * Get current velocity for weapon bobbing
   */
  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  /**
   * Check if player is on ground
   */
  public isOnGround(): boolean {
    return this.canJump;
  }

  /**
   * Check if player should shoot (respects fire rate)
   */
  public shouldShoot(): boolean {
    const now = Date.now();
    if (this.isShooting && (now - this.lastShotTime) >= this.fireRate) {
      this.lastShotTime = now;
      return true;
    }
    return false;
  }

  private async init(): Promise<void> {
    this.createPlayerBody();
    this.setupKeyboardControls();
    
    // Load player model if scene is provided
    if (this.scene) {
      await this.loadPlayerModel();
    }
  }

  private async loadPlayerModel(): Promise<void> {
    this.playerModel = new PlayerModel();
    await this.playerModel.load('/models/player-3.glb');
    
    const model = this.playerModel.getModel();
    if (model && this.scene) {
      // Hide model completely for local player (first-person)
      model.visible = false;
      this.scene.add(model);
      console.log('✅ Player model added to scene (hidden for first-person)');
    }
  }

  private createPlayerBody(): void {
    const world = this.physics.getWorld();
    const rapier = this.physics.getRapier();
    
    if (!world || !rapier) return;

    // Create rigid body at spawn position
    const rigidBodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(0, 2, 0)
      .lockRotations(); // Prevent player from tipping over
    
    this.rigidBody = world.createRigidBody(rigidBodyDesc);

    // Create capsule collider (standing upright)
    const capsuleHeight = this.HEIGHT - 2 * this.RADIUS;
    const colliderDesc = rapier.ColliderDesc.capsule(capsuleHeight / 2, this.RADIUS)
      .setFriction(0.0)
      .setRestitution(0.0);
    
    this.collider = world.createCollider(colliderDesc, this.rigidBody);
  }

  private setupKeyboardControls(): void {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'KeyD':
          this.moveRight = true;
          break;
        case 'Space':
          // Only jump if key wasn't already pressed (prevents holding space to fly)
          if (!this.jumpKeyPressed && this.canJump) {
            this.jump();
          }
          this.jumpKeyPressed = true;
          break;
      }
    });

    // Handle shooting with left click
    document.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Left click
        this.isShooting = true;
      }
    });

    document.addEventListener('mouseup', (event) => {
      if (event.button === 0) { // Left click
        this.isShooting = false;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'KeyD':
          this.moveRight = false;
          break;
        case 'Space':
          this.jumpKeyPressed = false;
          break;
      }
    });
  }

  private jump(): void {
    if (!this.rigidBody || !this.canJump) return;
    
    // Calculate jump velocity to reach desired height: v = sqrt(2 * g * h)
    const jumpVelocity = Math.sqrt(2 * 9.81 * this.JUMP_HEIGHT);
    
    const currentVel = this.rigidBody.linvel();
    this.rigidBody.setLinvel({ x: currentVel.x, y: jumpVelocity, z: currentVel.z }, true);
    this.canJump = false;
    
    // Play jump animation
    if (this.playerModel) {
      this.playerModel.playJumpUp();
    }
  }

  public update(deltaTime: number): void {
    if (!this.rigidBody) return;

    // Check if player is on ground
    const currentVel = this.rigidBody.linvel();
    this.canJump = Math.abs(currentVel.y) < 0.1;

    // Get camera direction (yaw only, no pitch)
    this.direction.set(0, 0, 0);
    
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    // Calculate movement direction
    if (this.moveForward) this.direction.add(cameraDirection);
    if (this.moveBackward) this.direction.sub(cameraDirection);
    if (this.moveRight) this.direction.add(cameraRight);
    if (this.moveLeft) this.direction.sub(cameraRight);

    // Normalize and apply speed
    if (this.direction.length() > 0) {
      this.direction.normalize();
      this.velocity.x = this.direction.x * this.WALK_SPEED;
      this.velocity.z = this.direction.z * this.WALK_SPEED;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Apply horizontal velocity, keep vertical velocity from physics
    this.rigidBody.setLinvel({ 
      x: this.velocity.x, 
      y: currentVel.y, 
      z: this.velocity.z 
    }, true);

    // Update character model position to match physics body
    const playerPos = this.rigidBody.translation();

    // Update camera position to eye height
    this.camera.position.set(
      playerPos.x,
      playerPos.y + this.CAMERA_HEIGHT,
      playerPos.z
    );

    // Update player model (follows capsule)
    if (this.playerModel) {
      // Position model at capsule feet (capsule center - half height)
      this.playerModel.setPosition(
        playerPos.x,
        playerPos.y - this.HEIGHT / 2,
        playerPos.z
      );

      // Rotation: Y-axis only (horizontal aim), never tilt the model
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = 0; // Flatten to horizontal plane
      cameraDirection.normalize();
      const yaw = Math.atan2(cameraDirection.x, cameraDirection.z);
      this.playerModel.setRotation(yaw);

      // Animation: state-based on velocity and ground status
      const isRunning = false; // TODO: Add sprint with Shift key
      const animName = this.playerModel.getAnimationForMovement(
        this.moveForward,
        this.moveBackward,
        this.moveLeft,
        this.moveRight,
        isRunning
      );

      if (animName) {
        this.playerModel.playAnimation(animName);
      } else {
        // Idle state - no animation
        this.playerModel.stopAnimation();
      }

      // Update animation mixer
      this.playerModel.update(deltaTime);
    }
  }

  public getPosition(): THREE.Vector3 {
    if (!this.rigidBody) return new THREE.Vector3();
    const pos = this.rigidBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  /**
   * Get movement state for animations
   */
  public getMovementState() {
    return {
      moveForward: this.moveForward,
      moveBackward: this.moveBackward,
      moveLeft: this.moveLeft,
      moveRight: this.moveRight,
      isMoving: this.moveForward || this.moveBackward || this.moveLeft || this.moveRight
    };
  }

  /**
   * Toggle between first-person (hidden) and third-person (full model visible)
   */
  public setModelVisible(visible: boolean): void {
    this.showModel = visible;
    const model = this.playerModel?.getModel();
    if (model) {
      model.visible = visible;
    }
  }

  /**
   * Get player model (for remote players)
   */
  public getPlayerModel(): PlayerModel | undefined {
    return this.playerModel;
  }

  /**
   * Get camera rotation for network sync (pitch and yaw)
   */
  public getRotation(): { pitch: number; yaw: number } {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // Calculate yaw (horizontal rotation)
    const yaw = Math.atan2(cameraDirection.x, cameraDirection.z);
    
    // Calculate pitch (vertical rotation)
    const pitch = Math.asin(-cameraDirection.y);
    
    return { pitch, yaw };
  }
}
