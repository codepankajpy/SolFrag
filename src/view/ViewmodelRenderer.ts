import * as THREE from 'three';

/**
 * ViewmodelRenderer handles rendering the weapon/viewmodel separately from the main scene.
 * This prevents z-fighting and depth issues by rendering with its own camera and scene.
 */
export class ViewmodelRenderer {
  public camera: THREE.PerspectiveCamera;
  public scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private spotLight: THREE.SpotLight;

  constructor(fov: number = 60) {
    // Create separate camera for weapon with higher FOV for better view
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );

    // Create separate scene for weapon
    this.scene = new THREE.Scene();
    
    // Add camera to scene so its children (weapon) are rendered
    this.scene.add(this.camera);

    // Add lighting for weapon
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    // Spot light to illuminate weapon from front
    this.spotLight = new THREE.SpotLight(0xffffff, 1);
    this.spotLight.position.set(0, 1, 0);
    this.spotLight.castShadow = true;
    this.scene.add(this.spotLight);
  }

  /**
   * Update the viewmodel camera aspect ratio on window resize
   */
  public onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Add a weapon mesh to the viewmodel camera (so it moves with camera)
   */
  public addWeapon(weapon: THREE.Group | THREE.Mesh | THREE.Sprite): void {
    this.camera.add(weapon);
  }

  /**
   * Remove a weapon mesh from the viewmodel camera
   */
  public removeWeapon(weapon: THREE.Group | THREE.Mesh | THREE.Sprite): void {
    this.camera.remove(weapon);
  }

  /**
   * Synchronize viewmodel camera rotation with main camera
   */
  public syncWithCamera(mainCamera: THREE.PerspectiveCamera): void {
    this.camera.quaternion.copy(mainCamera.quaternion);
    // Don't copy position - weapon is relative to camera's local space
  }

  /**
   * Render the viewmodel scene
   */
  public render(renderer: THREE.WebGLRenderer): void {
    // Clear depth buffer to render weapon on top
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
