import { create } from 'zustand';
import {
  PlayerState,
  ProjectileState,
  InputState,
  ServerMessage,
  ServerMessageType,
  ClientMessageType,
  PlayerId,
  NETWORK,
} from '@wizard-zone/shared';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface GameStore {
  // Connection state
  connectionState: ConnectionState;
  playerId: PlayerId | null;
  socket: WebSocket | null;
  latency: number;

  // Game state
  serverTick: number;
  localPlayer: PlayerState | null;
  remotePlayers: Map<PlayerId, PlayerState>;
  projectiles: ProjectileState[];

  // Input history for reconciliation
  inputHistory: InputState[];

  // Actions
  connect: (url: string, playerName: string) => void;
  disconnect: () => void;
  sendInput: (input: InputState) => void;
  addToInputHistory: (input: InputState) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  connectionState: 'disconnected',
  playerId: null,
  socket: null,
  latency: 0,

  serverTick: 0,
  localPlayer: null,
  remotePlayers: new Map(),
  projectiles: [],

  inputHistory: [],

  connect: (url: string, playerName: string) => {
    const socket = new WebSocket(url);
    set({ connectionState: 'connecting', socket });

    socket.onopen = () => {
      console.log('[GameStore] Connected to server');
      socket.send(
        JSON.stringify({
          type: ClientMessageType.JOIN_GAME,
          playerName,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        handleServerMessage(message, set, get);
      } catch (error) {
        console.error('[GameStore] Failed to parse message:', error);
      }
    };

    socket.onclose = () => {
      console.log('[GameStore] Disconnected from server');
      set({
        connectionState: 'disconnected',
        socket: null,
        playerId: null,
        localPlayer: null,
        remotePlayers: new Map(),
      });
    };

    socket.onerror = (error) => {
      console.error('[GameStore] WebSocket error:', error);
    };
  },

  disconnect: () => {
    const { socket } = get();
    socket?.close();
    set({
      connectionState: 'disconnected',
      socket: null,
      playerId: null,
    });
  },

  sendInput: (input: InputState) => {
    const { socket } = get();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: ClientMessageType.INPUT,
          input,
        })
      );
    }
  },

  addToInputHistory: (input: InputState) => {
    set((state) => ({
      inputHistory: [...state.inputHistory, input].slice(-NETWORK.MAX_INPUT_BUFFER_SIZE),
    }));
  },
}));

function handleServerMessage(
  message: ServerMessage,
  set: (fn: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void,
  get: () => GameStore
): void {
  switch (message.type) {
    case ServerMessageType.WELCOME:
      console.log('[GameStore] Received welcome, player ID:', message.playerId);
      set({
        connectionState: 'connected',
        playerId: message.playerId,
        serverTick: message.serverTick,
      });
      break;

    case ServerMessageType.GAME_STATE: {
      const { playerId } = get();
      const players = message.players;

      const remotePlayers = new Map<PlayerId, PlayerState>();
      let localPlayer: PlayerState | null = null;

      for (const [id, player] of Object.entries(players)) {
        if (id === playerId) {
          localPlayer = player;
        } else {
          remotePlayers.set(id, player);
        }
      }

      set({
        serverTick: message.tick,
        localPlayer,
        remotePlayers,
        projectiles: message.projectiles,
      });
      break;
    }

    case ServerMessageType.PONG: {
      const latency = Date.now() - message.clientTime;
      set({ latency });
      break;
    }

    case ServerMessageType.PLAYER_DIED:
      console.log('[GameStore] Player died:', message.playerId);
      break;

    case ServerMessageType.GAME_OVER:
      console.log('[GameStore] Game over! Winner:', message.winnerName);
      break;
  }
}
