import {
  PlayerState,
  PlayerId,
  InputState,
  GameStateMessage,
  ServerMessageType,
  ProjectileState,
  PlayerDiedMessage,
  GameOverMessage,
  GamePhaseUpdateMessage,
  CountdownUpdateMessage,
  GamePhase,
  createDefaultPlayerState,
  NETWORK,
  PHYSICS,
  ABILITIES,
  GAME,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { NovaBlastSystem } from '../systems/NovaBlastSystem.js';
import { ArcaneRaySystem } from '../systems/ArcaneRaySystem.js';
import { NovaBlastMessage, ArcaneRayMessage } from '@wizard-zone/shared';

type BroadcastFn = (message: object) => void;

export class GameRoom {
  public readonly roomId: string;

  // Game phase state
  private phase: GamePhase = 'waiting_for_players';

  // Connected players (persists across games)
  private connectedPlayers: Map<PlayerId, { name: string }> = new Map();

  // Active game state (cleared between games)
  private players: Map<PlayerId, PlayerState> = new Map();
  private projectiles: Map<string, ProjectileState> = new Map();
  private pendingInputs: Map<PlayerId, InputState[]> = new Map();
  private currentTick = 0;

  // Countdown state
  private countdownSeconds: number = 0;
  private countdownIntervalId: NodeJS.Timeout | null = null;

  // Game loop state
  private running = false;
  private broadcast: BroadcastFn = () => {};
  private intervalId: NodeJS.Timeout | null = null;

  // Systems
  private physicsSystem: PhysicsSystem;
  private projectileSystem: ProjectileSystem;
  private collisionSystem: CollisionSystem;
  private combatSystem: CombatSystem;
  private novaBlastSystem: NovaBlastSystem;
  private arcaneRaySystem: ArcaneRaySystem;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.physicsSystem = new PhysicsSystem();
    this.projectileSystem = new ProjectileSystem();
    this.collisionSystem = new CollisionSystem();
    this.combatSystem = new CombatSystem();
    this.novaBlastSystem = new NovaBlastSystem();
    this.arcaneRaySystem = new ArcaneRaySystem();
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
    this.stopCountdown();
  }

  addPlayer(playerId: PlayerId, playerName: string): void {
    // Always track in connected players
    this.connectedPlayers.set(playerId, { name: playerName });
    this.pendingInputs.set(playerId, []);

    if (this.phase === 'playing') {
      // Game in progress - spawn player immediately
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined mid-game at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);
    } else if (this.phase === 'waiting_for_players') {
      // Add to game state for rendering
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined waiting room at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);

      // Check if we now have enough players to start
      this.checkAutoStart();
    } else if (this.phase === 'countdown') {
      // Player joins during countdown - they'll be visible and in next game
      const player = createDefaultPlayerState(playerId, playerName);
      this.setRandomSpawnPosition(player);
      this.players.set(playerId, player);
      console.log(`[GameRoom] Player ${playerName} joined during countdown at (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})`);
    }

    // Broadcast phase to all clients (new player needs current state)
    this.broadcastPhase();
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

    if (this.phase === 'playing') {
      // Check win condition
      const winnerId = this.combatSystem.checkWinCondition(this.players);
      if (winnerId) {
        this.handleGameOver(winnerId);
      }
    } else if (this.phase === 'countdown') {
      // Check if we still have enough players for next game
      if (this.connectedPlayers.size < GAME.MIN_PLAYERS_TO_START) {
        // Cancel countdown and go back to waiting
        this.stopCountdown();
        this.phase = 'waiting_for_players';
        console.log('[GameRoom] Not enough players, returning to waiting state');
        this.broadcastPhase();
      }
    } else if (this.phase === 'waiting_for_players') {
      // Update player count
      this.broadcastPhase();
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

  private checkAutoStart(): void {
    if (this.phase !== 'waiting_for_players') return;

    if (this.connectedPlayers.size >= GAME.MIN_PLAYERS_TO_START) {
      this.startNewGame();
    }
  }

  private handleGameOver(winnerId: PlayerId): void {
    const winner = this.players.get(winnerId);
    const winnerName = winner?.name ?? 'Unknown';

    // Broadcast game over
    const gameOverMessage: GameOverMessage = {
      type: ServerMessageType.GAME_OVER,
      winnerId,
      winnerName,
    };
    this.broadcast(gameOverMessage);

    console.log(`[GameRoom] Game over! Winner: ${winnerName}`);

    // Start countdown for next game
    this.startCountdown();
  }

  private startCountdown(): void {
    this.phase = 'countdown';
    this.countdownSeconds = GAME.COUNTDOWN_SECONDS;

    this.broadcastPhase();
    this.broadcastCountdown();

    this.countdownIntervalId = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        this.startNewGame();
      } else {
        this.broadcastCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private startNewGame(): void {
    // Check minimum players
    if (this.connectedPlayers.size < GAME.MIN_PLAYERS_TO_START) {
      this.phase = 'waiting_for_players';
      this.broadcastPhase();
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

    this.phase = 'playing';
    this.broadcastPhase();

    console.log(`[GameRoom] New game started with ${this.players.size} players`);
  }

  private fullReset(): void {
    this.stopCountdown();
    this.phase = 'waiting_for_players';
    this.projectiles.clear();
    this.players.clear();
    this.currentTick = 0;
    console.log('[GameRoom] Room fully reset - all players left');
  }

  private broadcastPhase(): void {
    const message: GamePhaseUpdateMessage = {
      type: ServerMessageType.GAME_PHASE_UPDATE,
      phase: this.phase,
      minPlayers: GAME.MIN_PLAYERS_TO_START,
      currentPlayers: this.connectedPlayers.size,
    };
    this.broadcast(message);
  }

  private broadcastCountdown(): void {
    const message: CountdownUpdateMessage = {
      type: ServerMessageType.COUNTDOWN_UPDATE,
      secondsRemaining: this.countdownSeconds,
    };
    this.broadcast(message);
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
    if (this.phase !== 'playing') {
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
        hit.damage
      );

      if (death) {
        this.handleDeath(death);
      }
    }

    // Resolve player-player collisions (push apart)
    this.collisionSystem.resolvePlayerCollisions(this.players);

    // Update ability cooldowns
    this.projectileSystem.updateCooldowns(this.players, this.currentTick);
    this.physicsSystem.updateAbilityCooldowns(this.players, this.currentTick);

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

    // Dash ability (Shift)
    if (input.actions.dash) {
      this.physicsSystem.applyDash(player, input.look.yaw, this.currentTick);
    }

    // Launch jump ability (Q)
    if (input.actions.launchJump) {
      this.physicsSystem.applyLaunchJump(player, input.look.yaw, this.currentTick);
    }

    // Nova Blast ability (E)
    if (input.actions.novaBlast) {
      const result = this.novaBlastSystem.fireNovaBlast(
        player,
        this.players,
        this.currentTick
      );
      if (result) {
        // Broadcast visual effect to all clients
        const effectMessage: NovaBlastMessage = {
          type: ServerMessageType.NOVA_BLAST,
          casterId: result.casterId,
          position: result.casterPosition,
          radius: ABILITIES.NOVA_BLAST.RADIUS,
        };
        this.broadcast(effectMessage);

        // Apply damage to all hit players
        for (const victimId of result.hitPlayerIds) {
          const death = this.combatSystem.applyHit(
            this.players,
            victimId,
            result.casterId,
            result.damage
          );
          if (death) {
            this.handleDeath(death);
          }
        }
      }
    }

    // Arcane Ray ability (R)
    if (input.actions.arcaneRay) {
      const result = this.arcaneRaySystem.fireArcaneRay(
        player,
        this.players,
        this.currentTick
      );
      if (result) {
        // Broadcast visual effect to all clients
        const effectMessage: ArcaneRayMessage = {
          type: ServerMessageType.ARCANE_RAY,
          casterId: player.id,
          origin: result.origin,
          endpoint: result.endpoint,
          hitPlayerId: result.hitPlayerId,
        };
        this.broadcast(effectMessage);

        // Apply damage if hit
        if (result.hitPlayerId) {
          const death = this.combatSystem.applyHit(
            this.players,
            result.hitPlayerId,
            player.id,
            result.damage
          );
          if (death) {
            this.handleDeath(death);
          }
        }
      }
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
    if (this.phase === 'playing') {
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
