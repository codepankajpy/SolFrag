import * as THREE from 'three';

/**
 * AudioManager handles loading and playing weapon sounds
 */
export class AudioManager {
  private listener: THREE.AudioListener;
  private sounds: Map<string, THREE.Audio> = new Map();
  private loader: THREE.AudioLoader;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.loader = new THREE.AudioLoader();
  }

  /**
   * Load a sound file
   */
  public async loadSound(name: string, path: string): Promise<void> {
    try {
      const buffer = await this.loader.loadAsync(path);
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setVolume(0.5);
      this.sounds.set(name, sound);
      console.log(`Sound loaded: ${name}`);
    } catch (error) {
      console.error(`Error loading sound ${name}:`, error);
    }
  }

  /**
   * Play a sound (can overlap if already playing)
   */
  public playSound(name: string, volume: number = 0.5): void {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound "${name}" not found`);
      return;
    }

    // Clone the sound for overlapping playback
    const soundClone = sound.clone() as THREE.Audio;
    soundClone.setVolume(volume);
    soundClone.play();
    
    // Clean up after playing
    soundClone.onEnded = () => {
      soundClone.disconnect();
    };
  }

  /**
   * Stop a sound
   */
  public stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  /**
   * Set global volume
   */
  public setMasterVolume(volume: number): void {
    this.listener.setMasterVolume(volume);
  }
}
