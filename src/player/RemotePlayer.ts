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
  private lastVerticalDelta = 0; // For jump hysteresis debugging
  private inAirFrames = 0; // consecutive frames considered in-air
  private groundedFrames = 0; // consecutive frames considered grounded
  private readonly AIR_FRAMES_THRESHOLD = 3; // require 3 frames to confirm in-air
  private lastMovingTime = 0; // timestamp of last movement
  private readonly IDLE_DELAY_MS = 300; // wait this long after stopping before playing idle (ms)
  // groundedFrames threshold removed; we rely on counters directly
  
  // Network state
  private velocity = new THREE.Vector3();
  private isDead = false;
  
  // Animation state machine
  private currentAnimationState: AnimationState = 'idle';
  private lastAnimationState: AnimationState = 'idle';
  private currentAnimationName?: string;
  // (no lastAnimationName currently used)

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
    
    // Try to attach weapon to the model's hand (best-effort)
    try {
      // Attach weapon with conservative defaults and visualize attach pivot
      // so we can fine-tune if alignment is off.
      const attached = await this.playerModel.attachWeaponFromFile(
        '/models/AssaultRifle_2.glb',
        ['r_hand', 'right_hand', 'right', 'hand', 'wrist'],
        {
          // leave position/rotation unset so the weapon inherits bone transform,
          // only set a scale to keep it small relative to model.
          scale: 0.16,
        },
        true, // alignWithBone - attempt to orient weapon forward to bone direction
        true, // visualize the attach pivot (AxesHelper)
        true  // flipY: rotate 180° around Y so muzzle faces forward if asset is mirrored
      );
      if (attached) {
        console.log('🔫 Attached weapon to remote player hand');
      }
    } catch (err) {
      console.warn('Could not attach weapon to remote player:', err);
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

    // Compute vertical delta between our current interpolated position and new target
    const verticalDelta = Math.abs(this.position.y - this.targetPosition.y);
    this.lastVerticalDelta = verticalDelta;

    // Heuristic: consider in-air if vertical velocity is large or vertical delta is big
    const isLikelyInAir = velocity.y < -0.8 || verticalDelta > 0.15;

    // Update frame counters for debounce/hysteresis
    if (isLikelyInAir) {
      this.inAirFrames++;
      this.groundedFrames = 0;
    } else {
      this.groundedFrames++;
      this.inAirFrames = 0;
    }

    // Determine grounded state from counters (we only keep counters now)
    // this.isGrounded is inferred from counters when needed

    // Determine animation state based on server data and debounced counters
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
    const now = Date.now();
    
    // Debug: log when checking idle state
    const prevState = this.currentAnimationState;
    
    // Priority: jumping/falling > moving > idle
    // If debounced in-air, detect jump up/down using vertical velocity thresholds
    if (this.inAirFrames >= this.AIR_FRAMES_THRESHOLD) {
      // Only play upward jump animation. Do NOT play 'jump_down' to avoid flicker.
      if (this.velocity.y > 0.8) {
        this.currentAnimationState = 'jump_up';
      } else {
        // For downward/landing, fall through to run/idle logic (no jump_down animation)
        // leave currentAnimationState unchanged for now; it will be set by the run/idle checks below
      }
    } else if (horizontalSpeed > 0.1) {
      // Moving: update last moving time and switch to run immediately
      this.lastMovingTime = now;
      this.currentAnimationState = 'run';
    } else {
      // Not moving: only switch to idle after IDLE_DELAY_MS has passed
      if (now - this.lastMovingTime >= this.IDLE_DELAY_MS) {
        this.currentAnimationState = 'idle';
      } else {
        // keep previous state (usually 'run') until idle delay expires
        this.currentAnimationState = this.lastAnimationState;
      }
    }
    
    // Debug log state changes (include vertical info & counters)
    if (prevState !== this.currentAnimationState) {
      console.log(
        `🎭 ${this.username} animation: ${prevState} → ${this.currentAnimationState} ` +
        `(speed: ${horizontalSpeed.toFixed(3)}, velY: ${this.velocity.y.toFixed(3)}, vDelta: ${this.lastVerticalDelta.toFixed(3)}, inAirF: ${this.inAirFrames}, grdF: ${this.groundedFrames}, idleDelayMs: ${Math.max(0, this.IDLE_DELAY_MS - (now - this.lastMovingTime)).toFixed(0)})`
      );
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
        
      case 'run': {
        // Choose directional animation based on horizontal velocity relative to facing
        const horVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
        const speed = horVel.length();
        if (speed <= 0.1) {
          // no movement
          this.playerModel.stopAnimation(0.2);
          this.currentAnimationName = undefined;
          break;
        }

        // Forward/right vectors from rotationY
        const forward = new THREE.Vector3(-Math.sin(this.rotationY), 0, -Math.cos(this.rotationY));
        const right = new THREE.Vector3(Math.cos(this.rotationY), 0, -Math.sin(this.rotationY));

        const norm = horVel.clone().normalize();
        const f = norm.dot(forward); // -1..1
        const r = norm.dot(right);   // -1..1

        const moveForward = f > 0.5;
        const moveBackward = f < -0.5;
        const moveRight = r > 0.5;
        const moveLeft = r < -0.5;

        const animName = this.playerModel.getAnimationForMovement(
          moveForward,
          moveBackward,
          moveLeft,
          moveRight,
          true
        );

        const chosen = animName || (speed > 0 ? 'Run_Forward' : null);
        if (chosen && chosen !== this.currentAnimationName) {
          this.playerModel.playAnimation(chosen, 0.15);
          this.currentAnimationName = chosen;
        }
        break;
      }
        
      case 'jump_up':
        this.playerModel.playAnimation('Jump_Up', 0.1);
        this.currentAnimationName = 'Jump_Up';
        break;
        
      case 'jump_down':
        // Intentionally left blank: we don't play 'jump_down' to avoid flicker.
        // Downward/landing motions will show no animation (or fall back to idle/run).
        break;
        
      case 'death':
        this.playerModel.playAnimation('Death', 0.1);
        this.currentAnimationName = 'Death';
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
