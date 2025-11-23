import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Physics } from '../physics/Physics';
import { CharacterModel } from './CharacterModel';
import { HandWeapon } from '../game/HandWeapon';

export class Player {
  // Player specifications
  private readonly HEIGHT = 1.8;
  private readonly RADIUS = 0.3;
  private readonly CAMERA_HEIGHT = 1.65;
  private readonly WALK_SPEED = 5.2;
  private readonly JUMP_HEIGHT = 1.1;
  
  // Physics
  private physics: Physics;
  private rigidBody: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;
  
  // Camera
  private camera: THREE.PerspectiveCamera;
  
  // Character model
  private characterModel: CharacterModel;
  private scene: THREE.Scene;
  
  // Weapon
  private handWeapon: HandWeapon;
  
  // Movement state
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private canJump = false;
  
  // Movement direction
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();

  constructor(physics: Physics, camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.physics = physics;
    this.camera = camera;
    this.scene = scene;
    this.characterModel = new CharacterModel();
    this.handWeapon = new HandWeapon();
    
    this.init();
  }

  private async init(): Promise<void> {
    // Load character model with rigging
    const model = await this.characterModel.load('/models/character.glb');
    
    if (model) {
      // Scale character to match player height (1.8m)
      this.characterModel.setScale(this.HEIGHT);
      
      this.scene.add(model);
      console.log(`Character model loaded and scaled to ${this.HEIGHT}m`);
      
      // Load and attach weapon to right hand first
      await this.loadWeapon();
      
      // Then hide character body (but weapon will stay visible)
      model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
          // Hide the character mesh but keep bones and weapon visible
          if (!child.name.includes('weapon') && !child.name.includes('gun')) {
            child.visible = false;
          }
        }
      });
      console.log('Character body hidden for first-person view');
    }
    
    this.createPlayerBody();
    this.setupKeyboardControls();
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
          if (this.canJump) this.jump();
          break;
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
    
    if (this.characterModel.getModel()) {
      this.characterModel.setPosition(playerPos.x, playerPos.y - this.HEIGHT / 2, playerPos.z);
      
      // Rotate character to face movement direction
      if (this.direction.length() > 0) {
        const angle = Math.atan2(this.direction.x, this.direction.z);
        this.characterModel.setRotation(0, angle, 0);
      }
      
      // Update character animations
      this.characterModel.update(deltaTime);
    }

    // Update camera position - use head bone if available, otherwise eye height
    const headBone = this.characterModel.getHead();
    if (headBone) {
      // Get world position of head bone
      const headWorldPos = new THREE.Vector3();
      headBone.getWorldPosition(headWorldPos);
      this.camera.position.copy(headWorldPos);
    } else {
      // Fallback to calculated eye height
      this.camera.position.set(
        playerPos.x,
        playerPos.y + this.CAMERA_HEIGHT,
        playerPos.z
      );
    }
  }

  private async loadWeapon(): Promise<void> {
    // Load weapon model
    await this.handWeapon.loadWeapon('/models/ak47.glb');
    
    // Get right hand bone from character
    const rightHand = this.characterModel.getRightHand();
    
    if (rightHand) {
      // Attach weapon to hand
      this.handWeapon.attachToHand(rightHand);
      
      // Adjust weapon position, rotation, and scale to fit hand properly
      // These values will need fine-tuning based on the specific models
      const weaponPosition = new THREE.Vector3(0, 0, 0);
      const weaponRotation = new THREE.Euler(0, Math.PI / 2, 0);
      const weaponScale = 0.8; // Scale relative to character model
      
      this.handWeapon.adjustWeaponTransform(weaponPosition, weaponRotation, weaponScale);
      console.log('✓ Weapon loaded and attached to right hand');
    } else {
      console.error('✗ Could not find right hand bone to attach weapon');
    }
  }

  public getPosition(): THREE.Vector3 {
    if (!this.rigidBody) return new THREE.Vector3();
    const pos = this.rigidBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }
}
