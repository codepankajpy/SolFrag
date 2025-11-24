import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Physics } from '../physics/Physics';

export class MapLoader {
  private loader: GLTFLoader;
  private physics: Physics;

  constructor(physics: Physics) {
    this.loader = new GLTFLoader();
    
    // Setup Draco loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.loader.setDRACOLoader(dracoLoader);
    
    this.physics = physics;
  }

  public async loadMap(
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<THREE.Group | null> {
    try {
      const gltf = await this.loader.loadAsync(
        path,
        (progressEvent) => {
          if (onProgress && progressEvent.total > 0) {
            const percent = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(percent);
          }
        }
      );
      const map = gltf.scene;

      // Enable shadows on all meshes
      map.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Generate collision for the map
      this.generateMapCollision(map);

      console.log('Map loaded successfully:', path);
      return map;
    } catch (error) {
      console.error('Failed to load map:', path, error);
      return null;
    }
  }

  private generateMapCollision(map: THREE.Group): void {
    const world = this.physics.getWorld();
    const rapier = this.physics.getRapier();

    if (!world || !rapier) return;

    map.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        
        // Get world position and rotation
        child.updateMatrixWorld(true);
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        child.getWorldPosition(position);
        child.getWorldQuaternion(rotation);
        child.getWorldScale(scale);

        // Extract vertices and indices
        const vertices = this.getScaledVertices(geometry, scale);
        const indices = this.getIndices(geometry);

        if (vertices.length === 0 || indices.length === 0) return;

        // Create static rigid body
        const rigidBodyDesc = rapier.RigidBodyDesc.fixed()
          .setTranslation(position.x, position.y, position.z)
          .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });

        const rigidBody = world.createRigidBody(rigidBodyDesc);

        // Create trimesh collider
        const colliderDesc = rapier.ColliderDesc.trimesh(vertices, indices);
        world.createCollider(colliderDesc, rigidBody);
      }
    });
  }

  private getScaledVertices(geometry: THREE.BufferGeometry, scale: THREE.Vector3): Float32Array {
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return new Float32Array(0);

    const vertices = new Float32Array(positionAttribute.count * 3);
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertices[i * 3] = positionAttribute.getX(i) * scale.x;
      vertices[i * 3 + 1] = positionAttribute.getY(i) * scale.y;
      vertices[i * 3 + 2] = positionAttribute.getZ(i) * scale.z;
    }

    return vertices;
  }

  private getIndices(geometry: THREE.BufferGeometry): Uint32Array {
    const index = geometry.index;
    
    if (index) {
      return new Uint32Array(index.array);
    }

    // Generate indices if geometry doesn't have them
    const positionAttribute = geometry.getAttribute('position');
    const count = positionAttribute.count;
    const indices = new Uint32Array(count);
    
    for (let i = 0; i < count; i++) {
      indices[i] = i;
    }

    return indices;
  }
}
