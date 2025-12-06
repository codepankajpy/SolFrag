import RAPIER from '@dimforge/rapier3d-compat';

export class Physics {
  public world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;

  async init(): Promise<void> {
    await RAPIER.init();
    this.rapier = RAPIER;
    
    // Create physics world with realistic gravity
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }

  public step(_deltaTime: number): void {
    if (this.world) {
      this.world.step();
    }
  }

  public getRapier(): typeof RAPIER | null {
    return this.rapier;
  }

  public getWorld(): RAPIER.World | null {
    return this.world;
  }
}
