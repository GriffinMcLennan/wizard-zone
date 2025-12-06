import {
  PlayerState,
  PlayerId,
  InputState,
  GameStateMessage,
  ServerMessageType,
  ProjectileState,
  createDefaultPlayerState,
  NETWORK,
  PHYSICS,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';

type BroadcastFn = (message: object) => void;

export class GameRoom {
  public readonly roomId: string;
  private players: Map<PlayerId, PlayerState> = new Map();
  private projectiles: Map<string, ProjectileState> = new Map();
  private pendingInputs: Map<PlayerId, InputState[]> = new Map();
  private currentTick = 0;
  private running = false;
  private broadcast: BroadcastFn = () => {};
  private intervalId: NodeJS.Timeout | null = null;

  private physicsSystem: PhysicsSystem;
  private projectileSystem: ProjectileSystem;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.physicsSystem = new PhysicsSystem();
    this.projectileSystem = new ProjectileSystem();
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
    player.position.y = PHYSICS.PLAYER_HEIGHT / 2;

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
    const deltaSeconds = NETWORK.TICK_INTERVAL_MS / 1000;

    // Process all pending inputs
    this.processInputs();

    // Update physics
    this.physicsSystem.update(this.players, deltaSeconds);

    // Update projectiles
    const expiredProjectiles = this.projectileSystem.update(
      this.projectiles,
      this.currentTick,
      deltaSeconds
    );

    // Remove expired projectiles
    for (const id of expiredProjectiles) {
      this.projectiles.delete(id);
    }

    // Update ability cooldowns
    this.projectileSystem.updateCooldowns(this.players, this.currentTick);

    // Broadcast state to all clients
    this.broadcastState();
  }

  private processInputs(): void {
    for (const [playerId, inputs] of this.pendingInputs) {
      const player = this.players.get(playerId);
      if (!player || !player.isAlive) continue;

      for (const input of inputs) {
        this.applyInput(player, input);
        player.lastProcessedInput = input.sequenceNumber;
      }
    }

    // Clear processed inputs
    for (const inputs of this.pendingInputs.values()) {
      inputs.length = 0;
    }
  }

  private applyInput(player: PlayerState, input: InputState): void {
    // Update look direction
    player.yaw = input.look.yaw;
    player.pitch = input.look.pitch;

    // Apply movement
    this.physicsSystem.applyMovementInput(
      player,
      input.movement.forward,
      input.movement.backward,
      input.movement.left,
      input.movement.right,
      input.look.yaw
    );

    // Apply jump
    if (input.actions.jump) {
      this.physicsSystem.applyJump(player);
    }

    // Primary fire - spawn projectile
    if (input.actions.primaryFire) {
      if (this.projectileSystem.canFire(player, this.currentTick)) {
        const projectile = this.projectileSystem.createProjectile(player, this.currentTick);
        this.projectiles.set(projectile.id, projectile);
        this.projectileSystem.recordFire(player, this.currentTick);
      }
    }

    // Dash and launch jump will be added in Phase 7
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
