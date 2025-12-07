import {
  PlayerState,
  PlayerId,
  InputState,
  ProjectileState,
  ServerMessageType,
  ABILITIES,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { NovaBlastSystem } from '../systems/NovaBlastSystem.js';
import { ArcaneRaySystem } from '../systems/ArcaneRaySystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { NovaBlastMessage, ArcaneRayMessage } from '@wizard-zone/shared';

type BroadcastFn = (message: object) => void;
type DeathCallback = (death: { victimId: PlayerId; killerId: PlayerId }) => void;

export interface InputProcessorDeps {
  physicsSystem: PhysicsSystem;
  projectileSystem: ProjectileSystem;
  novaBlastSystem: NovaBlastSystem;
  arcaneRaySystem: ArcaneRaySystem;
  combatSystem: CombatSystem;
  broadcast: BroadcastFn;
}

export class InputProcessor {
  private physicsSystem: PhysicsSystem;
  private projectileSystem: ProjectileSystem;
  private novaBlastSystem: NovaBlastSystem;
  private arcaneRaySystem: ArcaneRaySystem;
  private combatSystem: CombatSystem;
  private broadcast: BroadcastFn;

  constructor(deps: InputProcessorDeps) {
    this.physicsSystem = deps.physicsSystem;
    this.projectileSystem = deps.projectileSystem;
    this.novaBlastSystem = deps.novaBlastSystem;
    this.arcaneRaySystem = deps.arcaneRaySystem;
    this.combatSystem = deps.combatSystem;
    this.broadcast = deps.broadcast;
  }

  applyInput(
    player: PlayerState,
    input: InputState,
    projectiles: Map<string, ProjectileState>,
    players: Map<PlayerId, PlayerState>,
    currentTick: number,
    onDeath: DeathCallback
  ): void {
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
      if (this.projectileSystem.canFire(player, currentTick)) {
        const projectile = this.projectileSystem.createProjectile(player, currentTick);
        projectiles.set(projectile.id, projectile);
        this.projectileSystem.recordFire(player, currentTick);
      }
    }

    // Dash ability (Shift)
    if (input.actions.dash) {
      this.physicsSystem.applyDash(player, input.look.yaw, currentTick);
    }

    // Launch jump ability (Q)
    if (input.actions.launchJump) {
      this.physicsSystem.applyLaunchJump(player, input.look.yaw, currentTick);
    }

    // Nova Blast ability (E)
    if (input.actions.novaBlast) {
      this.applyNovaBlast(player, players, currentTick, onDeath);
    }

    // Arcane Ray ability (R)
    if (input.actions.arcaneRay) {
      this.applyArcaneRay(player, players, currentTick, onDeath);
    }
  }

  private applyNovaBlast(
    player: PlayerState,
    players: Map<PlayerId, PlayerState>,
    currentTick: number,
    onDeath: DeathCallback
  ): void {
    const result = this.novaBlastSystem.fireNovaBlast(player, players, currentTick);
    if (!result) return;

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
        players,
        victimId,
        result.casterId,
        result.damage,
        currentTick
      );
      if (death) {
        onDeath(death);
      }
    }
  }

  private applyArcaneRay(
    player: PlayerState,
    players: Map<PlayerId, PlayerState>,
    currentTick: number,
    onDeath: DeathCallback
  ): void {
    const result = this.arcaneRaySystem.fireArcaneRay(player, players, currentTick);
    if (!result) return;

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
        players,
        result.hitPlayerId,
        player.id,
        result.damage,
        currentTick
      );
      if (death) {
        onDeath(death);
      }
    }
  }
}
