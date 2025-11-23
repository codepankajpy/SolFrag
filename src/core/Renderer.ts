import * as THREE from 'three';

export class Renderer {
  public instance: THREE.WebGLRenderer;

  constructor() {
    this.instance = new THREE.WebGLRenderer({ antialias: true });
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.body.appendChild(this.instance.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.instance.setSize(window.innerWidth, window.innerHeight);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.instance;
  }
}
