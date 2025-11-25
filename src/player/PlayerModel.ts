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
   * Attach a weapon (GLTF) to a hand bone on the player model.
   * Returns true if attached successfully.
   */
  public async attachWeaponFromFile(
    path: string,
    boneKeywords: string[] = ['r_hand', 'right_hand', 'right', 'hand', 'wrist', 'weapon'],
    offset: { position?: THREE.Vector3; rotation?: THREE.Euler; scale?: number } = {},
    alignWithBone: boolean = true,
    visualize: boolean = false,
    flipY: boolean = false
  ): Promise<boolean> {
    if (!this.model) return false;

    try {
      const gltf = await this.loader.loadAsync(path);
      const weapon = gltf.scene;

      // Helper: normalized lower-case name
      const norm = (s?: string) => (s || '').toLowerCase();

      // Prioritized search strategy for best hand bone match
      let attachBone: THREE.Object3D | undefined;

      // 1) If there are skinned meshes, prefer skeleton bones that match strong patterns
      const preferredPatterns = [
        ['r_hand'],
        ['right_hand'],
        ['right', 'hand'],
        ['hand', 'right'],
        ['hand'],
        ['wrist']
      ];

      // Collect skeleton bones
      const skeletonBones: THREE.Bone[] = [];
      this.model.traverse((c) => {
        if ((c as any).isSkinnedMesh || c.type === 'SkinnedMesh') {
          const sk = c as THREE.SkinnedMesh;
          if (sk.skeleton && sk.skeleton.bones) {
            for (const b of sk.skeleton.bones) skeletonBones.push(b);
          }
        }
      });

      // Search skeleton bones by prioritized patterns
      if (skeletonBones.length > 0) {
        for (const pattern of preferredPatterns) {
          for (const bone of skeletonBones) {
            const bname = norm(bone.name);
            let ok = true;
            for (const p of pattern) {
              if (!bname.includes(p)) { ok = false; break; }
            }
            if (ok) { attachBone = bone; break; }
          }
          if (attachBone) break;
        }
      }

      // 2) Fallback: traverse model object names using provided keywords but avoid single 'right' match
      if (!attachBone) {
        this.model.traverse((child) => {
          const name = norm(child.name);
          // require either 'hand' or 'wrist' or explicit 'r_' patterns; avoid matching just 'right'
          for (const kw of boneKeywords) {
            if (kw === 'right' && !name.includes('hand') && !name.includes('wrist')) continue;
            if (name.includes(kw)) {
              attachBone = child;
              return;
            }
          }
        });
      }

      // 3) Give up: attach to model root
      if (!attachBone) {
        console.warn('No hand bone found for attaching weapon; attaching to model root');
        attachBone = this.model;
      }

      // Default weapon scale conservative (small) if not provided
      const weaponScale = offset.scale !== undefined ? offset.scale : 0.16;
      weapon.scale.setScalar(weaponScale);

      // Align weapon with bone by default (zero local transform), then apply offsets
      weapon.position.set(0, 0, 0);

      // Default rotation to match first-person viewmodel base rotation
      // (this orients the muzzle forward for many weapon assets)
      const defaultRotation = new THREE.Euler(0, Math.PI * 0.5, 0);
      weapon.setRotationFromEuler(defaultRotation);

      // Apply any provided offsets on top of the default
      if (offset.position) {
        weapon.position.copy(offset.position);
      }
      if (offset.rotation) {
        // Apply user-specified rotation override
        weapon.setRotationFromEuler(offset.rotation);
      }

      // Prevent frustum culling from hiding the weapon
      weapon.traverse((c) => {
        if (c instanceof THREE.Mesh) c.frustumCulled = false;
      });

      // Optionally visualize the attach bone pivot to help tuning
      if (visualize && attachBone) {
        const axes = new THREE.AxesHelper(0.15);
        attachBone.add(axes);

        // Expose the attached weapon and a small helper to adjust offsets at runtime
        try {
          const win = (globalThis as any);
          win.__lastAttachedWeapon = weapon;
          win.__setWeaponOffset = (px: number, py: number, pz: number, rx: number, ry: number, rz: number, s?: number) => {
            if (!win.__lastAttachedWeapon) return;
            win.__lastAttachedWeapon.position.set(px, py, pz);
            win.__lastAttachedWeapon.rotation.set(rx, ry, rz);
            if (s !== undefined) win.__lastAttachedWeapon.scale.setScalar(s);
            console.log('Applied weapon offset', { px, py, pz, rx, ry, rz, s });
          };
        } catch (e) {
          // ignore if environment doesn't expose globalThis
        }
      }

      // Attach the weapon to the detected bone/object
      attachBone.add(weapon);

      // Best-effort: align the weapon's forward to the bone's forward direction
      if (alignWithBone && attachBone) {
        try {
          const worldPos = new THREE.Vector3();
          attachBone.getWorldPosition(worldPos);
          const forward = new THREE.Vector3();
          attachBone.getWorldDirection(forward);
          const lookTarget = worldPos.clone().add(forward);
          // weapon.lookAt expects a world-space target
          weapon.lookAt(lookTarget);
          // Note: different weapon assets have different local forward axes.
          // If the muzzle appears rotated, use the runtime helper `__setWeaponOffset` to fine-tune.
        } catch (e) {
          // ignore any errors from world transforms
        }
        // Optionally flip 180 degrees around Y (useful when model's local forward is opposite)
        if (flipY) {
          try {
            weapon.rotateY(Math.PI);
          } catch (e) {
            // ignore rotate errors
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to load/attach weapon GLTF:', err);
      return false;
    }
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
    _isRunning: boolean
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
