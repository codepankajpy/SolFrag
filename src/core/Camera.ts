import * as THREE from 'three';

export class Camera {
  public instance: THREE.PerspectiveCamera;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.instance = new THREE.PerspectiveCamera(70, width / height, 0.01, 100);
    this.instance.position.set(0, 0, 0);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.instance;
  }
}
