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

interface DeathInfo {
  victimId: PlayerId;
  victimName: string;
  killerId: PlayerId;
  killerName: string;
  timestamp: number;
}

interface GameOverInfo {
  winnerId: PlayerId;
  winnerName: string;
}

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

  // Death and game over state
  isSpectating: boolean;
  spectateTargetId: PlayerId | null;
  killFeed: DeathInfo[];
  gameOver: GameOverInfo | null;

  // Local look direction (client-authoritative for responsiveness)
  lookYaw: number;
  lookPitch: number;

  // Input history for reconciliation
  inputHistory: InputState[];

  // Actions
  connect: (url: string, playerName: string) => void;
  disconnect: () => void;
  sendInput: (input: InputState) => void;
  addToInputHistory: (input: InputState) => void;
  setLook: (yaw: number, pitch: number) => void;
  cycleSpectateTarget: (direction: 1 | -1) => void;
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

  isSpectating: false,
  spectateTargetId: null,
  killFeed: [],
  gameOver: null,

  lookYaw: 0,
  lookPitch: 0,

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
        isSpectating: false,
        spectateTargetId: null,
        killFeed: [],
        gameOver: null,
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

  setLook: (yaw: number, pitch: number) => {
    set({ lookYaw: yaw, lookPitch: pitch });
  },

  cycleSpectateTarget: (direction: 1 | -1) => {
    const { remotePlayers, spectateTargetId } = get();
    const alivePlayers = Array.from(remotePlayers.values()).filter(p => p.isAlive);

    if (alivePlayers.length === 0) {
      set({ spectateTargetId: null });
      return;
    }

    const currentIndex = spectateTargetId
      ? alivePlayers.findIndex(p => p.id === spectateTargetId)
      : -1;

    let newIndex: number;
    if (currentIndex === -1) {
      newIndex = 0;
    } else {
      newIndex = (currentIndex + direction + alivePlayers.length) % alivePlayers.length;
    }

    const targetPlayer = alivePlayers[newIndex];
    set({ spectateTargetId: targetPlayer?.id ?? null });
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

    case ServerMessageType.PLAYER_DIED: {
      const { playerId, remotePlayers } = get();
      const victim = message.playerId === playerId
        ? get().localPlayer
        : remotePlayers.get(message.playerId);
      const killer = message.killerId === playerId
        ? get().localPlayer
        : remotePlayers.get(message.killerId);

      const deathInfo: DeathInfo = {
        victimId: message.playerId,
        victimName: victim?.name ?? 'Unknown',
        killerId: message.killerId,
        killerName: killer?.name ?? 'Unknown',
        timestamp: Date.now(),
      };

      console.log(`[GameStore] ${deathInfo.victimName} was eliminated by ${deathInfo.killerName}`);

      // Add to kill feed (keep last 5)
      set((state) => ({
        killFeed: [...state.killFeed, deathInfo].slice(-5),
      }));

      // If local player died, enter spectator mode
      if (message.playerId === playerId) {
        console.log('[GameStore] You died! Entering spectator mode.');
        const alivePlayers = Array.from(remotePlayers.values()).filter(p => p.isAlive);
        const firstAlive = alivePlayers[0];
        set({
          isSpectating: true,
          spectateTargetId: firstAlive?.id ?? null,
        });
      }
      break;
    }

    case ServerMessageType.GAME_OVER: {
      console.log('[GameStore] Game over! Winner:', message.winnerName);
      set({
        gameOver: {
          winnerId: message.winnerId,
          winnerName: message.winnerName,
        },
      });
      break;
    }
  }
}
