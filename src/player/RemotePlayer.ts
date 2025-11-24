import * as THREE from 'three';
import { PlayerModel } from './PlayerModel';
import type { AnimationState } from '../network/types';

/**
 * Remote player representation (for multiplayer)
 * Server-authoritative with smooth interpolation
 */
export class RemotePlayer {
  private playerModel: PlayerModel;
  private playerId: string;
  private username: string;
  private scene: THREE.Scene;
  
  // Interpolation state
  private position = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private rotationY = 0;
  private targetRotationY = 0;
  private hasReceivedInitialState = false; // Track first network update
  
  // Network state
  private velocity = new THREE.Vector3();
  private isGrounded = true;
  private isDead = false;
  
  // Animation state machine
  private currentAnimationState: AnimationState = 'idle';
  private lastAnimationState: AnimationState = 'idle';

  constructor(playerId: string, username: string, scene: THREE.Scene) {
    this.playerId = playerId;
    this.username = username;
    this.scene = scene;
    this.playerModel = new PlayerModel();
  }

  /**
   * Load the player model
   */
  async load(): Promise<void> {
    await this.playerModel.load('/models/player-3.glb');
    
    const model = this.playerModel.getModel();
    if (model) {
      model.visible = true; // Always visible for remote players
      this.scene.add(model);
      
      // No idle animation - model stays in default pose when standing
      this.currentAnimationState = 'idle';
      this.lastAnimationState = 'idle';
      
      console.log(`✅ Remote player model loaded: ${this.username}`);
    }
  }

  /**
   * Update state from server (server-authoritative)
   * Sets target values for smooth interpolation
   */
  updateState(
    position: { x: number; y: number; z: number },
    rotation: { pitch: number; yaw: number },
    velocity: { x: number; y: number; z: number },
    alive: boolean = true
  ): void {
    // Set interpolation targets
    this.targetPosition.set(position.x, position.y, position.z);
    this.targetRotationY = rotation.yaw;
    
    // On first update, snap to position (no interpolation to prevent jumping)
    if (!this.hasReceivedInitialState) {
      this.position.copy(this.targetPosition);
      this.rotationY = this.targetRotationY;
      this.hasReceivedInitialState = true;
    }
    
    // Store velocity for animation state
    this.velocity.set(velocity.x, velocity.y, velocity.z);
    this.isDead = !alive;
    
    // Determine grounded state
    this.isGrounded = Math.abs(velocity.y) < 0.5;
    
    // Determine animation state based on server data
    this.updateAnimationState();
  }
  
  /**
   * Animation state machine - determines which animation to play
   */
  private updateAnimationState(): void {
    if (this.isDead) {
      this.currentAnimationState = 'death';
      return;
    }
    
    const horizontalSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.z * this.velocity.z
    );
    
    // Debug: log when checking idle state
    const prevState = this.currentAnimationState;
    
    // Priority: jumping/falling > moving > idle
    if (!this.isGrounded) {
      if (this.velocity.y > 0.5) {
        this.currentAnimationState = 'jump_up';
      } else if (this.velocity.y < -0.5) {
        this.currentAnimationState = 'jump_down';
      }
    } else if (horizontalSpeed > 0.1) {
      this.currentAnimationState = 'run';
    } else {
      this.currentAnimationState = 'idle';
    }
    
    // Debug log state changes
    if (prevState !== this.currentAnimationState) {
      console.log(`🎭 ${this.username} animation: ${prevState} → ${this.currentAnimationState} (speed: ${horizontalSpeed.toFixed(3)})`);
    }
  }

  /**
   * Update interpolation and animations (called every frame)
   * No network lag teleporting - smooth lerping only
   */
  update(deltaTime: number): void {
    // Smooth position interpolation (lerp factor 0.15 for 60fps smooth)
    this.position.lerp(this.targetPosition, 0.15);
    
    // Smooth rotation interpolation (Y-axis only)
    this.rotationY = THREE.MathUtils.lerp(
      this.rotationY,
      this.targetRotationY,
      0.2
    );
    
    // Apply interpolated transforms to model
    this.playerModel.setPosition(
      this.position.x,
      this.position.y - 0.9, // Offset to feet
      this.position.z
    );
    this.playerModel.setRotation(this.rotationY);
    
    // Play animation only if state changed (avoid restarting same animation)
    if (this.currentAnimationState !== this.lastAnimationState) {
      this.playAnimation(this.currentAnimationState);
      this.lastAnimationState = this.currentAnimationState;
    }
    
    // Update animation mixer
    this.playerModel.update(deltaTime);
  }
  
  /**
   * Animation controller - maps state to actual animation names
   */
  private playAnimation(state: AnimationState): void {
    switch (state) {
      case 'idle':
        // Stop all animations when standing still (no idle animation)
        this.playerModel.stopAnimation(0.3);
        break;
        
      case 'run':
        // Try Run_Forward, fallback to any run animation
        if (!this.playerModel.playAnimation('Run_Forward', 0.2)) {
          this.playerModel.playAnimation('Run', 0.2);
        }
        break;
        
      case 'jump_up':
        this.playerModel.playAnimation('Jump_Up', 0.1);
        break;
        
      case 'jump_down':
        this.playerModel.playAnimation('Jump_Down', 0.1);
        break;
        
      case 'death':
        this.playerModel.playAnimation('Death', 0.1);
        break;
    }
  }

  /**
   * Remove from scene
   */
  dispose(): void {
    const model = this.playerModel.getModel();
    if (model) {
      this.scene.remove(model);
    }
  }

  /**
   * Get player ID
   */
  getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Get username
   */
  getUsername(): string {
    return this.username;
  }

  /**
   * Play shooting animation/effect
   */
  playShootEffect(): void {
    // TODO: Add muzzle flash effect at weapon position
    console.log(`${this.username} is shooting!`);
  }
}
