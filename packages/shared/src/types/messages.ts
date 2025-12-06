import type { InputState } from './input.js';
import type { PlayerState, PlayerId } from './player.js';
import type { ProjectileState } from './projectile.js';
import type { Vec3 } from './vectors.js';

// ============ Client -> Server Messages ============

export enum ClientMessageType {
  JOIN_GAME = 'join_game',
  INPUT = 'input',
  PING = 'ping',
}

export interface JoinGameMessage {
  type: ClientMessageType.JOIN_GAME;
  playerName: string;
}

export interface InputMessage {
  type: ClientMessageType.INPUT;
  input: InputState;
}

export interface PingMessage {
  type: ClientMessageType.PING;
  clientTime: number;
}

export type ClientMessage = JoinGameMessage | InputMessage | PingMessage;

// ============ Server -> Client Messages ============

export enum ServerMessageType {
  WELCOME = 'welcome',
  GAME_STATE = 'game_state',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_DIED = 'player_died',
  GAME_OVER = 'game_over',
  GAME_PHASE_UPDATE = 'game_phase_update',
  COUNTDOWN_UPDATE = 'countdown_update',
  PONG = 'pong',
  ERROR = 'error',
  NOVA_BLAST = 'nova_blast',
  ARCANE_RAY = 'arcane_ray',
}

export interface WelcomeMessage {
  type: ServerMessageType.WELCOME;
  playerId: PlayerId;
  serverTick: number;
  tickRate: number;
}

export interface GameStateMessage {
  type: ServerMessageType.GAME_STATE;
  tick: number;
  timestamp: number;
  players: Record<PlayerId, PlayerState>;
  projectiles: ProjectileState[];
}

export interface PlayerJoinedMessage {
  type: ServerMessageType.PLAYER_JOINED;
  player: PlayerState;
}

export interface PlayerLeftMessage {
  type: ServerMessageType.PLAYER_LEFT;
  playerId: PlayerId;
}

export interface PlayerDiedMessage {
  type: ServerMessageType.PLAYER_DIED;
  playerId: PlayerId;
  killerId: PlayerId;
}

export interface GameOverMessage {
  type: ServerMessageType.GAME_OVER;
  winnerId: PlayerId;
  winnerName: string;
}

// Game phase types
export type GamePhase = 'waiting_for_players' | 'playing' | 'countdown';

export interface GamePhaseUpdateMessage {
  type: ServerMessageType.GAME_PHASE_UPDATE;
  phase: GamePhase;
  minPlayers: number;
  currentPlayers: number;
}

export interface CountdownUpdateMessage {
  type: ServerMessageType.COUNTDOWN_UPDATE;
  secondsRemaining: number;
}

export interface PongMessage {
  type: ServerMessageType.PONG;
  clientTime: number;
  serverTime: number;
}

export interface ErrorMessage {
  type: ServerMessageType.ERROR;
  message: string;
}

export interface NovaBlastMessage {
  type: ServerMessageType.NOVA_BLAST;
  casterId: PlayerId;
  position: Vec3;
  radius: number;
}

export interface ArcaneRayMessage {
  type: ServerMessageType.ARCANE_RAY;
  casterId: PlayerId;
  origin: Vec3;
  endpoint: Vec3;
  hitPlayerId: PlayerId | null;
}

export type ServerMessage =
  | WelcomeMessage
  | GameStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerDiedMessage
  | GameOverMessage
  | GamePhaseUpdateMessage
  | CountdownUpdateMessage
  | PongMessage
  | ErrorMessage
  | NovaBlastMessage
  | ArcaneRayMessage;
