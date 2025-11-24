import * as THREE from 'three';

/**
 * Audio system for 3D positional audio
 */
export class AudioSystem {
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sounds: Map<string, AudioBuffer> = new Map();

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();
  }

  /**
   * Load a sound file
   */
  async loadSound(name: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        path,
        (buffer) => {
          this.sounds.set(name, buffer);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Failed to load sound ${name}:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Play a sound at a 3D position
   */
  playPositionalSound(
    name: string,
    position: THREE.Vector3,
    volume: number = 1.0,
    maxDistance: number = 50
  ): THREE.PositionalAudio | null {
    const buffer = this.sounds.get(name);
    if (!buffer) {
      console.warn(`Sound ${name} not loaded`);
      return null;
    }

    const sound = new THREE.PositionalAudio(this.listener);
    sound.setBuffer(buffer);
    sound.setRefDistance(10);
    sound.setMaxDistance(maxDistance);
    sound.setVolume(volume);
    sound.position.copy(position);

    // Create a temporary object to hold the sound
    const soundObject = new THREE.Object3D();
    soundObject.position.copy(position);
    soundObject.add(sound);

    // Play and auto-cleanup
    sound.play();
    sound.onEnded = () => {
      soundObject.remove(sound);
    };

    return sound;
  }

  /**
   * Play a non-positional sound (for local player)
   */
  playSound(name: string, volume: number = 1.0): THREE.Audio | null {
    const buffer = this.sounds.get(name);
    if (!buffer) {
      console.warn(`Sound ${name} not loaded`);
      return null;
    }

    const sound = new THREE.Audio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume(volume);
    sound.play();

    return sound;
  }

  /**
   * Get the audio listener
   */
  getListener(): THREE.AudioListener {
    return this.listener;
  }
}
