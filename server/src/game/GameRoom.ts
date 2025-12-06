import {
  PlayerState,
  PlayerId,
  InputState,
  GameStateMessage,
  ServerMessageType,
  ProjectileState,
  createDefaultPlayerState,
  NETWORK,
} from '@wizard-zone/shared';

type BroadcastFn = (message: object) => void;

export class GameRoom {
  private roomId: string;
  private players: Map<PlayerId, PlayerState> = new Map();
  private projectiles: Map<string, ProjectileState> = new Map();
  private pendingInputs: Map<PlayerId, InputState[]> = new Map();
  private currentTick = 0;
  private running = false;
  private broadcast: BroadcastFn = () => {};
  private intervalId: NodeJS.Timeout | null = null;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  setBroadcaster(fn: BroadcastFn): void {
    this.broadcast = fn;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log(`[GameRoom] Starting game loop at ${NETWORK.TICK_RATE}Hz`);

    this.intervalId = setInterval(() => {
      this.tick();
    }, NETWORK.TICK_INTERVAL_MS);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addPlayer(playerId: PlayerId, playerName: string): void {
    const player = createDefaultPlayerState(playerId, playerName);

    // Randomize spawn position
    player.position.x = (Math.random() - 0.5) * 20;
    player.position.z = (Math.random() - 0.5) * 20;
    player.position.y = 1;

    this.players.set(playerId, player);
    this.pendingInputs.set(playerId, []);

    console.log(`[GameRoom] Added player ${playerName} at position (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);
  }

  removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
    this.pendingInputs.delete(playerId);
  }

  handleInput(playerId: PlayerId, input: InputState): void {
    const inputs = this.pendingInputs.get(playerId);
    if (inputs) {
      inputs.push(input);
    }
  }

  private tick(): void {
    this.currentTick++;

    // Process inputs (will be expanded in Phase 3)
    this.processInputs();

    // Update physics (will be expanded in Phase 3)
    // this.updatePhysics();

    // Update collisions (will be expanded in Phase 5)
    // this.updateCollisions();

    // Broadcast state to all clients
    this.broadcastState();
  }

  private processInputs(): void {
    for (const [playerId, inputs] of this.pendingInputs) {
      const player = this.players.get(playerId);
      if (!player || !player.isAlive) continue;

      for (const input of inputs) {
        // Update look direction
        player.yaw = input.look.yaw;
        player.pitch = input.look.pitch;
        player.lastProcessedInput = input.sequenceNumber;
      }
    }

    // Clear processed inputs
    for (const inputs of this.pendingInputs.values()) {
      inputs.length = 0;
    }
  }

  private broadcastState(): void {
    const playersObj: Record<PlayerId, PlayerState> = {};
    for (const [id, player] of this.players) {
      playersObj[id] = player;
    }

    const message: GameStateMessage = {
      type: ServerMessageType.GAME_STATE,
      tick: this.currentTick,
      timestamp: Date.now(),
      players: playersObj,
      projectiles: Array.from(this.projectiles.values()),
    };

    this.broadcast(message);
  }
}
