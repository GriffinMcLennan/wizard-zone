import {
  PlayerState,
  PlayerId,
  InputState,
  GameStateMessage,
  ServerMessageType,
  ProjectileState,
  PlayerDiedMessage,
  createDefaultPlayerState,
  NETWORK,
  PHYSICS,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { NovaBlastSystem } from '../systems/NovaBlastSystem.js';
import { ArcaneRaySystem } from '../systems/ArcaneRaySystem.js';
import { HealthRegenSystem } from '../systems/HealthRegenSystem.js';
import { CooldownSystem } from '../systems/CooldownSystem.js';
import { GamePhaseManager } from './GamePhaseManager.js';
import { InputProcessor } from './InputProcessor.js';

type BroadcastFn = (message: object) => void;

export class GameRoom {
  public readonly roomId: string;

  // Connected players (persists across games)
  private connectedPlayers: Map<PlayerId, { name: string }> = new Map();

  // Active game state (cleared between games)
  private players: Map<PlayerId, PlayerState> = new Map();
  private projectiles: Map<string, ProjectileState> = new Map();
  private pendingInputs: Map<PlayerId, InputState[]> = new Map();
  private currentTick = 0;

  // Game loop state
  private running = false;
  private broadcast: BroadcastFn = () => {};
  private intervalId: NodeJS.Timeout | null = null;

  // Phase manager and input processor
  private phaseManager: GamePhaseManager;
  private inputProcessor: InputProcessor;

  // Systems
  private physicsSystem: PhysicsSystem;
  private projectileSystem: ProjectileSystem;
  private collisionSystem: CollisionSystem;
  private combatSystem: CombatSystem;
  private healthRegenSystem: HealthRegenSystem;
  private cooldownSystem: CooldownSystem;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.physicsSystem = new PhysicsSystem();
    this.projectileSystem = new ProjectileSystem();
    this.collisionSystem = new CollisionSystem();
    this.combatSystem = new CombatSystem();
    const novaBlastSystem = new NovaBlastSystem();
    const arcaneRaySystem = new ArcaneRaySystem();
    this.healthRegenSystem = new HealthRegenSystem();
    this.cooldownSystem = new CooldownSystem();

    // Initialize phase manager (broadcast will be set later)
    this.phaseManager = new GamePhaseManager(
      (msg) => this.broadcast(msg),
      () => this.onGameStart()
    );

    // Initialize input processor
    this.inputProcessor = new InputProcessor({
      physicsSystem: this.physicsSystem,
      projectileSystem: this.projectileSystem,
      novaBlastSystem,
      arcaneRaySystem,
      combatSystem: this.combatSystem,
      broadcast: (msg) => this.broadcast(msg),
    });
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
    this.phaseManager.stop();
  }

  addPlayer(playerId: PlayerId, playerName: string): void {
    // Always track in connected players
    this.connectedPlayers.set(playerId, { name: playerName });
    this.pendingInputs.set(playerId, []);

    const phase = this.phaseManager.getPhase();

    if (phase === 'playing') {
      // Game in progress - spawn player immediately
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined mid-game at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);
    } else if (phase === 'waiting_for_players') {
      // Add to game state for rendering
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined waiting room at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);

      // Check if we now have enough players to start
      this.phaseManager.checkAutoStart(this.connectedPlayers.size);
    } else if (phase === 'countdown') {
      // Player joins during countdown - they'll be visible and in next game
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined during countdown at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);
    }

    // Broadcast phase to all clients (new player needs current state)
    this.phaseManager.broadcastPhase(this.connectedPlayers.size);
  }

  removePlayer(playerId: PlayerId): void {
    const playerInfo = this.connectedPlayers.get(playerId);
    this.connectedPlayers.delete(playerId);
    this.players.delete(playerId);
    this.pendingInputs.delete(playerId);

    console.log(`[GameRoom] Player ${playerInfo?.name ?? playerId} disconnected`);

    // If room is now empty, full reset
    if (this.connectedPlayers.size === 0) {
      this.fullReset();
      return;
    }

    const phase = this.phaseManager.getPhase();

    if (phase === 'playing') {
      // Check win condition
      const winnerId = this.combatSystem.checkWinCondition(this.players);
      if (winnerId) {
        this.handleGameOver(winnerId);
      }
    } else if (phase === 'countdown') {
      // Let phase manager handle countdown cancellation if needed
      this.phaseManager.onPlayerCountChanged(this.connectedPlayers.size);
    } else if (phase === 'waiting_for_players') {
      // Update player count
      this.phaseManager.broadcastPhase(this.connectedPlayers.size);
    }
  }

  private setRandomSpawnPosition(player: PlayerState): void {
    // Randomize spawn position, avoiding the central platform (X: -6 to 6, Z: -6 to 6)
    let spawnX: number;
    let spawnZ: number;
    do {
      spawnX = (Math.random() - 0.5) * 40; // -20 to 20
      spawnZ = (Math.random() - 0.5) * 40; // -20 to 20
    } while (Math.abs(spawnX) < 7 && Math.abs(spawnZ) < 7); // Exclude central platform area with buffer

    player.position.x = spawnX;
    player.position.z = spawnZ;
    player.position.y = PHYSICS.PLAYER_HEIGHT / 2;
  }

  private handleGameOver(winnerId: PlayerId): void {
    const winner = this.players.get(winnerId);
    const winnerName = winner?.name ?? 'Unknown';
    this.phaseManager.handleGameOver(winnerId, winnerName);
  }

  private onGameStart(): void {
    // Check minimum players
    if (!this.phaseManager.canStartNewGame(this.connectedPlayers.size)) {
      console.log('[GameRoom] Not enough players to start new game');
      return;
    }

    // Reset game state
    this.projectiles.clear();
    this.currentTick = 0;
    this.players.clear();

    // Respawn all connected players
    for (const [playerId, { name }] of this.connectedPlayers) {
      const player = createDefaultPlayerState(playerId, name);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      this.pendingInputs.set(playerId, []);
    }

    this.phaseManager.startPlaying(this.connectedPlayers.size);
    console.log(`[GameRoom] New game started with ${this.players.size} players`);
  }

  private fullReset(): void {
    this.phaseManager.fullReset();
    this.projectiles.clear();
    this.players.clear();
    this.currentTick = 0;
    console.log('[GameRoom] Room fully reset - all players left');
  }

  handleInput(playerId: PlayerId, input: InputState): void {
    const inputs = this.pendingInputs.get(playerId);
    if (inputs) {
      inputs.push(input);
    }
  }

  private tick(): void {
    this.currentTick++;

    // Always broadcast state so clients can render
    // But only process game logic during 'playing' phase
    if (this.phaseManager.getPhase() !== 'playing') {
      this.broadcastState();
      return;
    }

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

    // Check projectile-player collisions
    const hits = this.collisionSystem.checkProjectileCollisions(
      this.players,
      this.projectiles
    );

    // Process hits - apply damage and remove projectiles
    for (const hit of hits) {
      // Remove the projectile that hit
      this.projectiles.delete(hit.projectileId);

      // Apply damage (ownerId is already in the hit result)
      const death = this.combatSystem.applyHit(
        this.players,
        hit.playerId,
        hit.ownerId,
        hit.damage,
        this.currentTick
      );

      if (death) {
        this.handleDeath(death);
      }
    }

    // Resolve player-player collisions (push apart)
    this.collisionSystem.resolvePlayerCollisions(this.players);

    // Update ability cooldowns
    this.cooldownSystem.updateAllCooldowns(this.players, this.currentTick);

    // Update health regeneration
    this.healthRegenSystem.update(this.players, this.currentTick, deltaSeconds);

    // Broadcast state to all clients
    this.broadcastState();
  }

  private processInputs(): void {
    for (const [playerId, inputs] of this.pendingInputs) {
      const player = this.players.get(playerId);
      if (!player || !player.isAlive) continue;

      for (const input of inputs) {
        this.inputProcessor.applyInput(
          player,
          input,
          this.projectiles,
          this.players,
          this.currentTick,
          (death) => this.handleDeath(death)
        );
        player.lastProcessedInput = input.sequenceNumber;
      }
    }

    // Clear processed inputs
    for (const inputs of this.pendingInputs.values()) {
      inputs.length = 0;
    }
  }

  private handleDeath(death: { victimId: PlayerId; killerId: PlayerId }): void {
    const deathMessage: PlayerDiedMessage = {
      type: ServerMessageType.PLAYER_DIED,
      playerId: death.victimId,
      killerId: death.killerId,
    };
    this.broadcast(deathMessage);

    // Check win condition
    if (this.phaseManager.getPhase() === 'playing') {
      const winnerId = this.combatSystem.checkWinCondition(this.players);
      if (winnerId) {
        this.handleGameOver(winnerId);
      }
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
