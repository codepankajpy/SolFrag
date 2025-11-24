/**
 * Shared types for client (copied from server)
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  pitch: number;
  yaw: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Rotation;
  velocity: Vector3;
  health: number;
  alive: boolean;
  username: string;
}

export interface GameState {
  tick: number;
  timestamp: number;
  players: { [id: string]: PlayerState };
}

export enum MessageType {
  PLAYER_JOIN = 'player_join',
  PLAYER_INPUT = 'player_input',
  PLAYER_SHOOT = 'player_shoot',
  PLAYER_DISCONNECT = 'player_disconnect',
  GAME_STATE = 'game_state',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_SHOT = 'player_shot',
  PLAYER_HIT = 'player_hit',
  PLAYER_DIED = 'player_died',
}

export interface NetworkMessage {
  type: MessageType | string;
  data: any;
  timestamp: number;
}
