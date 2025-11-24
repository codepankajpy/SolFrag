import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from '../game/GameServer';
import type {
  NetworkMessage,
  MessageType,
  JoinMessage,
  PlayerInput,
} from '../types/game.types';
import { GAME_CONSTANTS } from '../constants/game.constants';

interface Client {
  ws: WebSocket;
  playerId: string;
  username: string;
  lastUpdate: number;
}

/**
 * Manages WebSocket connections and message routing
 */
export class NetworkManager {
  private wss: WebSocketServer;
  private gameServer: GameServer;
  private clients: Map<WebSocket, Client> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private playerCounter = 1;
  private usedNumbers: Set<number> = new Set();

  constructor(wss: WebSocketServer, gameServer: GameServer) {
    this.wss = wss;
    this.gameServer = gameServer;
    
    this.setupWebSocketServer();
    this.startBroadcastLoop();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New connection established');
      
      ws.on('message', (data: Buffer) => {
        try {
          const message: NetworkMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: NetworkMessage): void {
    const { type, data } = message;
    
    switch (type) {
      case 'player_join':
        this.handlePlayerJoin(ws, data as JoinMessage);
        break;
        
      case 'player_input':
        this.handlePlayerInput(ws, data as PlayerInput);
        break;
        
      case 'player_shoot':
        this.handlePlayerShoot(ws, data);
        break;
        
      default:
        console.warn('⚠️  Unknown message type:', type);
    }
  }

  private handlePlayerJoin(ws: WebSocket, data: JoinMessage): void {
    const playerId = this.generatePlayerId();
    
    // Always generate username on server for consistency
    const username = this.generateUsername();
    
    const player = this.gameServer.addPlayer(playerId, username);
    
    // Register client with username
    this.clients.set(ws, {
      ws,
      playerId,
      username,
      lastUpdate: Date.now(),
    });
    
    // Send join confirmation with current game state
    this.sendMessage(ws, {
      type: 'player_joined',
      data: {
        playerId,
        gameState: this.gameServer.getGameState(),
      },
      timestamp: Date.now(),
    });
    
    // Notify all other players
    this.broadcastExcept(ws, {
      type: 'player_joined',
      data: {
        player: player.getState(),
      },
      timestamp: Date.now(),
    });
  }

  private handlePlayerInput(ws: WebSocket, input: PlayerInput): void {
    const client = this.clients.get(ws);
    if (!client) return;
    
    const player = this.gameServer.getPlayer(client.playerId);
    if (player) {
      player.handleInput(input);
      client.lastUpdate = Date.now();
    }
  }

  private handlePlayerShoot(ws: WebSocket, data: any): void {
    const client = this.clients.get(ws);
    if (!client) return;
    
    // Broadcast shoot event to all clients
    this.broadcast({
      type: 'player_shot',
      data: {
        playerId: client.playerId,
        ...data,
      },
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      // Free up the username number
      this.freeUsername(client.username);
      
      this.gameServer.removePlayer(client.playerId);
      this.clients.delete(ws);
      
      // Notify all clients with username
      this.broadcast({
        type: 'player_left',
        data: {
          playerId: client.playerId,
          username: client.username,
        },
        timestamp: Date.now(),
      });
      
      console.log('🔌 Client disconnected');
    }
  }

  private startBroadcastLoop(): void {
    // Broadcast game state at fixed rate
    const broadcastRate = 1000 / GAME_CONSTANTS.TICK_RATE;
    
    this.broadcastInterval = setInterval(() => {
      const gameState = this.gameServer.getGameState();
      
      this.broadcast({
        type: 'game_state',
        data: gameState,
        timestamp: Date.now(),
      });
    }, broadcastRate);
  }

  private sendMessage(ws: WebSocket, message: NetworkMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: NetworkMessage): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private broadcastExcept(excludeWs: WebSocket, message: NetworkMessage): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUsername(): string {
    // Find next available player number
    while (this.usedNumbers.has(this.playerCounter)) {
      this.playerCounter++;
    }
    
    const username = `Player ${this.playerCounter}`;
    this.usedNumbers.add(this.playerCounter);
    this.playerCounter++;
    
    return username;
  }

  private freeUsername(username: string): void {
    // Extract number from "Player X" format
    const match = username.match(/^Player (\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      this.usedNumbers.delete(number);
    }
  }
}
