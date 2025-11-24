import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Player model with animations
 */
export class PlayerModel {
  private model?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private currentAnimation?: THREE.AnimationAction;
  private loader = new GLTFLoader();

  /**
   * Load the player model with all animations
   */
  async load(path: string = '/models/player-3.glb'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.model = gltf.scene;
          
          // Scale to 1.55m height (0.2 less than before - was 1.75)
          this.model.scale.setScalar(1.55);
          
          // Prevent frustum culling issues
          this.model.traverse((obj) => {
            obj.frustumCulled = false;
          });
          
          // Setup animation mixer
          this.mixer = new THREE.AnimationMixer(this.model);
          
          // Store all animations by name
          gltf.animations.forEach((clip) => {
            const action = this.mixer!.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            this.animations.set(clip.name, action);
            console.log('  📹 Animation found:', clip.name, `(${clip.duration.toFixed(2)}s)`);
          });
          
          console.log('✅ Player model loaded with', this.animations.size, 'animations');
          resolve();
        },
        undefined,
        (error) => {
          console.error('❌ Failed to load player model:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Get the 3D model
   */
  getModel(): THREE.Group | undefined {
    return this.model;
  }

  /**
   * Update animations
   */
  update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  /**
   * Play an animation by name
   * @returns true if animation was found and played, false otherwise
   */
  playAnimation(name: string, fadeTime: number = 0.2): boolean {
    const action = this.animations.get(name);
    
    if (!action) {
      console.warn(`⚠️  Animation '${name}' not found. Available:`, Array.from(this.animations.keys()));
      // No animation found, stop current animation
      if (this.currentAnimation) {
        this.currentAnimation.fadeOut(fadeTime);
        this.currentAnimation = undefined;
      }
      return false;
    }
    
    // If same animation is already playing, do nothing
    if (this.currentAnimation === action && action.isRunning()) {
      return true;
    }
    
    // Fade out current animation
    if (this.currentAnimation && this.currentAnimation !== action) {
      this.currentAnimation.fadeOut(fadeTime);
    }
    
    // Fade in new animation
    action.reset();
    action.fadeIn(fadeTime);
    action.play();
    
    this.currentAnimation = action;
    return true;
  }

  /**
   * Stop all animations (return to T-pose / idle)
   */
  stopAnimation(fadeTime: number = 0.2): void {
    if (this.currentAnimation) {
      this.currentAnimation.fadeOut(fadeTime);
      this.currentAnimation.stop();
      this.currentAnimation = undefined;
    }
  }

  /**
   * Update animation based on movement state (state machine approach)
   */
  updateAnimationFromState(
    velocity: THREE.Vector3,
    isGrounded: boolean,
    fadeTime: number = 0.2
  ): void {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    
    // Determine state based on velocity
    if (!isGrounded) {
      // In air - check if going up or down
      if (velocity.y > 0.5) {
        this.playAnimation('Jump_Up', fadeTime);
      } else if (velocity.y < -0.5) {
        this.playAnimation('Jump_Down', fadeTime);
      }
    } else if (speed > 0.1) {
      // Moving - determine direction
      // For now, we'll use a simple run animation
      // The getAnimationForMovement provides more granular control
      this.playAnimation('Run_Forward', fadeTime);
    } else {
      // Idle - no animation (T-pose or idle pose)
      this.stopAnimation(fadeTime);
    }
  }

  /**
   * Get animation name based on movement state
   */
  getAnimationForMovement(
    moveForward: boolean,
    moveBackward: boolean,
    moveLeft: boolean,
    moveRight: boolean,
    isRunning: boolean
  ): string | null {
    // No movement = idle (no animation)
    if (!moveForward && !moveBackward && !moveLeft && !moveRight) {
      return null;
    }

    // Try to find best matching animation based on available animations
    const availableAnims = Array.from(this.animations.keys());
    
    // Helper to find animation by partial match
    const findAnim = (keywords: string[]): string | null => {
      for (const keyword of keywords) {
        const found = availableAnims.find(name => 
          name.toLowerCase().includes(keyword.toLowerCase())
        );
        if (found) return found;
      }
      return null;
    };

    // Diagonal movements (most specific first)
    if (moveForward && moveLeft) {
      return findAnim(['Forward_Left', 'Run_Left', 'left']) || findAnim(['walk', 'run', 'forward']);
    }
    if (moveForward && moveRight) {
      return findAnim(['Forward_Right', 'Run_Right', 'right']) || findAnim(['walk', 'run', 'forward']);
    }
    if (moveBackward && moveLeft) {
      return findAnim(['Backward_Left', 'back']) || findAnim(['walk', 'run']);
    }
    if (moveBackward && moveRight) {
      return findAnim(['Backward_Right', 'back']) || findAnim(['walk', 'run']);
    }

    // Cardinal directions
    if (moveForward) {
      return findAnim(['Run_Forward', 'Forward', 'run', 'walk']);
    }
    if (moveBackward) {
      return findAnim(['Run_Backward', 'Backward', 'back']);
    }
    if (moveLeft) {
      return findAnim(['Run_Left', 'left', 'strafe']);
    }
    if (moveRight) {
      return findAnim(['Run_Right', 'right', 'strafe']);
    }

    // Fallback: just play any movement animation
    return availableAnims.find(name => 
      name.toLowerCase().includes('run') || 
      name.toLowerCase().includes('walk') ||
      name.toLowerCase().includes('forward')
    ) || null;
  }

  /**
   * Set the model position
   */
  setPosition(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  /**
   * Set the model rotation
   */
  setRotation(yaw: number): void {
    if (this.model) {
      this.model.rotation.y = yaw;
    }
  }

  /**
   * Hide head and upper body for first-person view
   */
  setFirstPersonMode(enabled: boolean): void {
    if (!this.model) return;
    
    this.model.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
        const name = obj.name.toLowerCase();
        // Hide head, face, hair, and upper body parts in first-person
        if (enabled && (name.includes('head') || name.includes('face') || 
                        name.includes('hair') || name.includes('eye') ||
                        name.includes('neck') || name.includes('upper'))) {
          obj.visible = false;
        } else {
          obj.visible = true;
        }
      }
    });
  }

  /**
   * Play death animation
   */
  playDeath(): void {
    this.playAnimation('Death', 0.1);
  }

  /**
   * Play jump up animation
   */
  playJumpUp(): void {
    this.playAnimation('Jump_Up', 0.1);
  }

  /**
   * Play jump down animation
   */
  playJumpDown(): void {
    this.playAnimation('Jump_Down', 0.1);
  }
}
