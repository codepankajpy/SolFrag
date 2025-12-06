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
  kills?: number;
}

/**
 * Animation state for players
 */
export type AnimationState = 'idle' | 'run' | 'jump_up' | 'jump_down' | 'death';

export interface GameState {
  tick: number;
  timestamp: number;
  players: { [id: string]: PlayerState };
  scores?: { [username: string]: number };
}

export const MessageType = {
  PLAYER_JOIN: 'player_join',
  PLAYER_INPUT: 'player_input',
  PLAYER_SHOOT: 'player_shoot',
  PLAYER_DISCONNECT: 'player_disconnect',
  GAME_STATE: 'game_state',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_SHOT: 'player_shot',
  PLAYER_HIT: 'player_hit',
  PLAYER_DIED: 'player_died',
  SCORE_UPDATE: 'score_update',
  MATCH_WON: 'match_won',
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export interface NetworkMessage {
  type: MessageType | string;
  data: any;
  timestamp: number;
}
