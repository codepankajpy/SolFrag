import RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerState, GameState } from '../types/game.types.js';
import { GAME_CONSTANTS } from '../constants/game.constants.js';
import { ServerPlayer } from '../player/ServerPlayer.js';

/**
 * Main game server - handles game state, physics, and player management
 */
export class GameServer {
  private world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;
  private players: Map<string, ServerPlayer> = new Map();
  private tick: number = 0;
  private lastUpdate: number = 0;
  private running: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    // Initialize RAPIER physics
    await RAPIER.init();
    this.rapier = RAPIER;
    
    const gravity = new RAPIER.Vector3(0.0, GAME_CONSTANTS.GRAVITY, 0.0);
    this.world = new RAPIER.World(gravity);
    
    // Create ground collider
    this.createGroundCollider();
    
    console.log('✅ Physics engine initialized');
    
    // Start game loop
    this.start();
  }

  private createGroundCollider(): void {
    if (!this.world) return;
    
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50);
    this.world.createCollider(groundColliderDesc, groundBody);
  }

  start(): void {
    this.running = true;
    this.lastUpdate = Date.now();
    
    // Fixed tick rate game loop
    const tickRate = 1000 / GAME_CONSTANTS.TICK_RATE;
    this.tickInterval = setInterval(() => this.update(), tickRate);
    
    console.log(`✅ Game loop started at ${GAME_CONSTANTS.TICK_RATE}Hz`);
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log('⏹️  Game loop stopped');
  }

  private update(): void {
    if (!this.world || !this.running) return;
    
    const now = Date.now();
    const deltaTime = GAME_CONSTANTS.FIXED_TIMESTEP;
    
    // Step physics
    this.world.step();
    
    // Update all players
    for (const player of this.players.values()) {
      player.update(deltaTime);
    }
    
    this.tick++;
    this.lastUpdate = now;
  }

  addPlayer(id: string, username: string): ServerPlayer {
    const player = new ServerPlayer(id, username, this.world!, this.rapier!);
    this.players.set(id, player);
    
    console.log(`✅ Player joined: ${username} (${id})`);
    console.log(`👥 Total players: ${this.players.size}`);
    
    return player;
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      player.destroy();
      this.players.delete(id);
      console.log(`👋 Player left: ${player.getState().username} (${id})`);
      console.log(`👥 Total players: ${this.players.size}`);
    }
  }

  getPlayer(id: string): ServerPlayer | undefined {
    return this.players.get(id);
  }

  getGameState(): GameState {
    const playersState: { [id: string]: PlayerState } = {};
    
    for (const [id, player] of this.players) {
      playersState[id] = player.getState();
    }
    
    return {
      tick: this.tick,
      timestamp: Date.now(),
      players: playersState,
    };
  }

  getPlayers(): Map<string, ServerPlayer> {
    return this.players;
  }
}
