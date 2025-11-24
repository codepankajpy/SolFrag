import * as THREE from 'three';

export class Renderer {
  public instance: THREE.WebGLRenderer;

  constructor() {
    this.instance = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance', // Optimize for performance
    });
    this.instance.setSize(window.innerWidth, window.innerHeight);
    
    // Reduce shadow map quality for better performance
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFShadowMap; // Faster than PCFSoft
    
    this.instance.autoClear = false; // Manual clearing for multi-pass rendering
    
    document.body.appendChild(this.instance.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.instance.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Render main scene
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.clear(); // Clear both color and depth
    this.instance.render(scene, camera);
  }
  
  /**
   * Render weapon scene on top (with depth clear)
   */
  public renderWeapon(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.clearDepth(); // Clear only depth buffer, keep color
    this.instance.render(scene, camera);
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.instance;
  }
}
