import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class CharacterModel {
  private model: THREE.Group | null = null;
  private loader: GLTFLoader;
  private rightHand: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: { [key: string]: THREE.AnimationAction } = {};

  constructor() {
    this.loader = new GLTFLoader();
    
    // Setup Draco loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.loader.setDRACOLoader(dracoLoader);
  }

  public async load(path: string): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(path);
      this.model = gltf.scene;

      // Enable shadows
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Setup animation mixer if animations exist
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.model);
        
        gltf.animations.forEach((clip) => {
          const action = this.mixer!.clipAction(clip);
          this.animations[clip.name] = action;
        });

        console.log('Available animations:', Object.keys(this.animations));
      }

      // Find right hand bone
      this.findRightHand();
      
      // Find head/eye bone for camera
      this.findHead();

      console.log('Character model loaded successfully');
      return this.model;
    } catch (error) {
      console.error('Failed to load character model:', error);
      return null;
    }
  }

  private findRightHand(): void {
    if (!this.model) return;

    console.log('=== Searching for hand bone ===');

    // Common hand/arm bone names - expanded list for new model
    const handNames = [
      'mixamorigRightHand',
      'RightHand',
      'Right_Hand',
      'hand_r',
      'hand.R',
      'RightHandBone',
      'Bip01_R_Hand',
      'R_Hand',
      'right_hand',
      'Hand_R',
      'HandRight'
    ];

    // First, log all bones in the model
    const bones: string[] = [];
    const allNames: string[] = [];
    this.model.traverse((object) => {
      allNames.push(`${object.type}: ${object.name}`);
      if (object.type === 'Bone' || object.name.toLowerCase().includes('hand') || 
          object.name.toLowerCase().includes('arm') || object.name.toLowerCase().includes('wrist')) {
        bones.push(`${object.type}: ${object.name}`);
      }
    });
    console.log('Bones and hand/arm-related objects:', bones);

    // Search for hand bone with more flexible matching
    this.model.traverse((object) => {
      if (!this.rightHand) {
        const lowerName = object.name.toLowerCase();
        
        // Check exact matches first
        if (handNames.some(name => object.name === name)) {
          this.rightHand = object;
          console.log('✓ Found right hand bone (exact match):', object.name);
        }
        // Check for right hand variations
        else if ((lowerName.includes('right') || lowerName.includes('_r') || lowerName.endsWith('.r')) && 
                 lowerName.includes('hand')) {
          this.rightHand = object;
          console.log('✓ Found right hand bone (pattern match):', object.name);
        }
        // Fallback to right wrist or forearm
        else if (!this.rightHand && 
                 (lowerName.includes('right') || lowerName.includes('_r') || lowerName.endsWith('.r')) && 
                 (lowerName.includes('wrist') || lowerName.includes('forearm'))) {
          this.rightHand = object;
          console.log('✓ Found right hand bone (wrist/forearm fallback):', object.name);
        }
      }
    });

    if (!this.rightHand) {
      console.warn('✗ Could not find right hand bone automatically');
      console.log('All objects in model (first 50):', allNames.slice(0, 50));
      
      // Try to find ANY hand/wrist bone as last resort
      this.model.traverse((object) => {
        if (!this.rightHand) {
          const lowerName = object.name.toLowerCase();
          if (lowerName.includes('hand') || lowerName.includes('wrist')) {
            this.rightHand = object;
            console.log('⚠ Using fallback hand bone:', object.name);
          }
        }
      });
    }
  }

  private findHead(): void {
    if (!this.model) return;

    console.log('=== Searching for head/eye bone ===');

    // Common head/eye bone names
    const headNames = [
      'Head',
      'head',
      'Head_End',
      'mixamorigHead',
      'Bip01_Head',
      'Neck',
      'neck'
    ];

    // Search for head bone
    this.model.traverse((object) => {
      if (!this.head) {
        const lowerName = object.name.toLowerCase();
        
        // Check exact matches first
        if (headNames.some(name => object.name === name || lowerName === name.toLowerCase())) {
          this.head = object;
          console.log('✓ Found head bone:', object.name);
        }
        // Check for head variations
        else if (lowerName.includes('head') && !lowerName.includes('headtop')) {
          this.head = object;
          console.log('✓ Found head bone (pattern match):', object.name);
        }
      }
    });

    if (!this.head) {
      console.warn('✗ Could not find head bone');
    }
  }

  public getRightHand(): THREE.Object3D | null {
    return this.rightHand;
  }

  public getHead(): THREE.Object3D | null {
    return this.head;
  }

  public getModel(): THREE.Group | null {
    return this.model;
  }

  public update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  public playAnimation(name: string, loop: boolean = true): void {
    if (!this.animations[name]) {
      console.warn(`Animation "${name}" not found`);
      return;
    }

    // Stop all other animations
    Object.values(this.animations).forEach(action => action.stop());

    // Play the requested animation
    const action = this.animations[name];
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.reset();
    action.play();
  }

  public setPosition(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  public setRotation(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.rotation.set(x, y, z);
    }
  }

  public setScale(targetHeight: number): void {
    if (!this.model) return;

    // Calculate current height
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const currentHeight = size.y;

    // Scale to match target height
    const scale = targetHeight / currentHeight;
    this.model.scale.set(scale, scale, scale);

    console.log(`Character scaled from ${currentHeight.toFixed(2)}m to ${targetHeight}m (scale: ${scale.toFixed(2)})`);
  }
}
