import type { NetworkMessage, PlayerState, GameState } from './types';

/**
 * Network client for multiplayer connection
 */
export class NetworkClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private playerId: string | null = null;
  
  // Callbacks
  private onConnectedCallback?: (playerId: string, username: string, gameState: GameState) => void;
  private onPlayerJoinedCallback?: (player: PlayerState) => void;
  private onPlayerLeftCallback?: (playerId: string, username: string) => void;
  private onGameStateCallback?: (gameState: GameState) => void;
  private onPlayerShotCallback?: (playerId: string, position: any, direction: any) => void;
  private onPlayerHitCallback?: (shooterId: string, victimId: string, damage: number) => void;
  private onPlayerDiedCallback?: (shooterId: string, victimId: string, shooterName?: string, victimName?: string) => void;
  private onDisconnectedCallback?: () => void;
  private customHandlers: Map<string, (data: any) => void> = new Map();

  constructor(private serverUrl: string = 'ws://localhost:3001') {}

  /**
   * Connect to the game server
   */
  public connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('✅ Connected to game server');
          this.connected = true;
          
          // Send join message
          this.send({
            type: 'player_join',
            data: { username },
            timestamp: Date.now(),
          });
        };

        this.ws.onmessage = (event) => {
          try {
            const message: NetworkMessage = JSON.parse(event.data);
            this.handleMessage(message);
            
            // Resolve on first successful join
            if (message.type === 'player_joined' && !this.playerId) {
              this.playerId = message.data.playerId;
              
              // Get username from game state
              const username = message.data.gameState?.players?.[message.data.playerId]?.username || 'Unknown';
              
              if (this.onConnectedCallback) {
                this.onConnectedCallback(message.data.playerId, username, message.data.gameState);
              }
              resolve();
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(new Error('Failed to connect to server'));
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from server');
          this.connected = false;
          this.playerId = null;
          if (this.onDisconnectedCallback) {
            this.onDisconnectedCallback();
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'player_joined':
        if (message.data.player && this.onPlayerJoinedCallback) {
          this.onPlayerJoinedCallback(message.data.player);
        }
        break;

      case 'player_left':
        if (this.onPlayerLeftCallback) {
          this.onPlayerLeftCallback(message.data.playerId, message.data.username || 'Unknown');
        }
        break;

      case 'player_shot':
        if (message.data.playerId !== this.playerId && this.onPlayerShotCallback) {
          this.onPlayerShotCallback(
            message.data.playerId,
            message.data.position,
            message.data.direction
          );
        }
        break;

      case 'game_state':
        if (this.onGameStateCallback) {
          this.onGameStateCallback(message.data);
        }
        break;

      case 'player_hit':
        if (this.onPlayerHitCallback) {
          this.onPlayerHitCallback(message.data.shooterId, message.data.victimId, message.data.damage);
        }
        break;

      case 'player_died':
        if (this.onPlayerDiedCallback) {
          this.onPlayerDiedCallback(message.data.shooterId, message.data.victimId, message.data.shooterName, message.data.victimName);
        }
        break;

      default:
        const handler = this.customHandlers.get(String(message.type));
        if (handler) handler(message.data);
        else console.log('Unknown message type:', message.type);
    }
  }

  private send(message: NetworkMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Set callback for when connected
   */
  public onConnected(callback: (playerId: string, username: string, gameState: GameState) => void): void {
    this.onConnectedCallback = callback;
  }

  /**
   * Set callback for when a player joins
   */
  public onPlayerJoined(callback: (player: PlayerState) => void): void {
    this.onPlayerJoinedCallback = callback;
  }

  /**
   * Set callback for when a player leaves
   */
  public onPlayerLeft(callback: (playerId: string, username: string) => void): void {
    this.onPlayerLeftCallback = callback;
  }

  /**
   * Set callback for game state updates
   */
  public onGameState(callback: (gameState: GameState) => void): void {
    this.onGameStateCallback = callback;
  }

  /**
   * Set callback for disconnection
   */
  public onPlayerShot(callback: (playerId: string, position: any, direction: any) => void): void {
    this.onPlayerShotCallback = callback;
  }

  public onPlayerHit(callback: (shooterId: string, victimId: string, damage: number) => void): void {
    this.onPlayerHitCallback = callback;
  }

  public onPlayerDied(callback: (shooterId: string, victimId: string, shooterName?: string, victimName?: string) => void): void {
    this.onPlayerDiedCallback = callback;
  }

  public onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  public onMessage(type: string, handler: (data: any) => void): void {
    this.customHandlers.set(type, handler);
  }

  /**
   * Send shoot event to server
   */
  public sendShoot(position: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }): void {
    this.send({
      type: 'player_shoot',
      data: { position, direction },
      timestamp: Date.now(),
    });
  }

  /**
   * Send player input/position update to server
   */
  public sendPlayerUpdate(
    position: { x: number; y: number; z: number },
    rotation: { pitch: number; yaw: number },
    velocity: { x: number; y: number; z: number }
  ): void {
    this.send({
      type: 'player_input',
      data: { position, rotation, velocity },
      timestamp: Date.now(),
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }
}
