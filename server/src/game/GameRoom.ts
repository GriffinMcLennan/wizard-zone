import {
  PlayerState,
  PlayerId,
  InputState,
  GameStateMessage,
  ServerMessageType,
  ProjectileState,
  PlayerDiedMessage,
  GameOverMessage,
  NovaBlastMessage,
  ArcaneRayMessage,
  createDefaultPlayerState,
  NETWORK,
  PHYSICS,
  ABILITIES,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { NovaBlastSystem } from '../systems/NovaBlastSystem.js';
import { ArcaneRaySystem } from '../systems/ArcaneRaySystem.js';

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
  private gameOver = false;

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
    if (!this.gameOver) {
      const winnerId = this.combatSystem.checkWinCondition(this.players);
      if (winnerId) {
        const winner = this.players.get(winnerId);
        const gameOverMessage: GameOverMessage = {
          type: ServerMessageType.GAME_OVER,
          winnerId,
          winnerName: winner?.name ?? 'Unknown',
        };
        this.broadcast(gameOverMessage);
        this.gameOver = true;
        console.log(`[GameRoom] Game over! Winner: ${winner?.name}`);
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
