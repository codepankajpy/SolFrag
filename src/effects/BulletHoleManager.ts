import * as THREE from 'three';

/**
 * Manages bullet hole decals on surfaces
 */
export class BulletHoleManager {
  private scene: THREE.Scene;
  private bulletHoles: Array<{ mesh: THREE.Mesh; timestamp: number }> = [];
  private bulletHoleLifetime = 5000; // 5 seconds
  private bulletHoleTexture?: THREE.Texture;
  private raycaster: THREE.Raycaster;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.loadTexture();
  }

  /**
   * Load bullet hole texture
   */
  private loadTexture(): void {
    const textureLoader = new THREE.TextureLoader();
    this.bulletHoleTexture = textureLoader.load('/textures/bullet-hole-1.png');
  }

  /**
   * Cast a ray from camera and create bullet hole if it hits something
   */
  public shootRay(camera: THREE.Camera): void {
    // Set raycast from center of screen (where crosshair is)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Check intersections with scene objects
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.createBulletHole(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0));
    }
  }

  /**
   * Create a bullet hole decal at the hit position
   */
  private createBulletHole(position: THREE.Vector3, normal: THREE.Vector3): void {
    if (!this.bulletHoleTexture) return;

    // Create a small plane for the bullet hole
    const size = 0.1 + Math.random() * 0.05; // Random size variation
    const geometry = new THREE.PlaneGeometry(size, size);
    
    const material = new THREE.MeshBasicMaterial({
      map: this.bulletHoleTexture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const decal = new THREE.Mesh(geometry, material);

    // Position the decal at hit point, slightly offset from surface
    decal.position.copy(position);
    decal.position.add(normal.clone().multiplyScalar(0.01));

    // Orient decal to face away from the surface
    decal.lookAt(position.clone().add(normal));

    // Random rotation for variety
    decal.rotateZ(Math.random() * Math.PI * 2);

    this.scene.add(decal);

    // Store with timestamp
    this.bulletHoles.push({
      mesh: decal,
      timestamp: Date.now(),
    });
  }

  /**
   * Update and remove old bullet holes
   */
  public update(): void {
    const now = Date.now();
    
    // Remove expired bullet holes
    this.bulletHoles = this.bulletHoles.filter((hole) => {
      const age = now - hole.timestamp;
      
      if (age > this.bulletHoleLifetime) {
        this.scene.remove(hole.mesh);
        hole.mesh.geometry.dispose();
        (hole.mesh.material as THREE.Material).dispose();
        return false;
      }
      
      // Fade out in the last second
      if (age > this.bulletHoleLifetime - 1000) {
        const fadeProgress = (age - (this.bulletHoleLifetime - 1000)) / 1000;
        (hole.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - fadeProgress);
      }
      
      return true;
    });
  }

  /**
   * Clear all bullet holes
   */
  public clear(): void {
    this.bulletHoles.forEach((hole) => {
      this.scene.remove(hole.mesh);
      hole.mesh.geometry.dispose();
      (hole.mesh.material as THREE.Material).dispose();
    });
    this.bulletHoles = [];
  }
}
