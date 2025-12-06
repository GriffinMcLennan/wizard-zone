import { v4 as uuidv4 } from 'uuid';
import {
  ProjectileState,
  ProjectileType,
  PlayerState,
  PlayerId,
  ABILITIES,
  ARENA_COLLISION,
  sphereOverlapsAABB,
  sphereOverlapsCylinder,
  cooldownMsToTicks,
  ticksToMs,
  getDirectionFromLook,
} from '@wizard-zone/shared';

export class ProjectileSystem {
  createProjectile(
    owner: PlayerState,
    tick: number
  ): ProjectileState {
    // Calculate spawn position (in front of player at eye level)
    const spawnDistance = 1.0;
    const eyeHeight = 0.9; // Relative to player position

    // Get direction from yaw/pitch using shared utility
    const dir = getDirectionFromLook(owner.yaw, owner.pitch);

    const projectile: ProjectileState = {
      id: uuidv4(),
      type: ProjectileType.FIREBALL,
      ownerId: owner.id,
      position: {
        x: owner.position.x + dir.x * spawnDistance,
        y: owner.position.y + eyeHeight + dir.y * spawnDistance,
        z: owner.position.z + dir.z * spawnDistance,
      },
      velocity: {
        x: dir.x * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
        y: dir.y * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
        z: dir.z * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
      },
      createdAt: tick,
      lifetime: cooldownMsToTicks(ABILITIES.PRIMARY_FIRE.LIFETIME_MS),
      damage: ABILITIES.PRIMARY_FIRE.DAMAGE,
      radius: ABILITIES.PRIMARY_FIRE.RADIUS,
    };

    return projectile;
  }

  update(
    projectiles: Map<string, ProjectileState>,
    currentTick: number,
    deltaSeconds: number
  ): string[] {
    const expiredIds: string[] = [];

    for (const [id, projectile] of projectiles) {
      // Update position
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;
      projectile.position.z += projectile.velocity.z * deltaSeconds;

      // Check arena collision (walls, platforms, cylinders)
      if (this.checkArenaCollision(projectile)) {
        expiredIds.push(id);
        continue;
      }

      // Check lifetime
      const age = currentTick - projectile.createdAt;
      if (age >= projectile.lifetime) {
        expiredIds.push(id);
      }

      // Check bounds (remove if too far)
      const maxDistance = 100;
      if (
        Math.abs(projectile.position.x) > maxDistance ||
        Math.abs(projectile.position.y) > maxDistance ||
        Math.abs(projectile.position.z) > maxDistance
      ) {
        expiredIds.push(id);
      }
    }

    return expiredIds;
  }

  canFire(player: PlayerState, currentTick: number): boolean {
    const cooldownTicks = cooldownMsToTicks(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS);
    const ticksSinceLastFire = currentTick - player.abilities.primaryFire.lastUsed;
    return ticksSinceLastFire >= cooldownTicks;
  }

  recordFire(player: PlayerState, currentTick: number): void {
    player.abilities.primaryFire.lastUsed = currentTick;
    player.abilities.primaryFire.ready = false;
    player.abilities.primaryFire.cooldownRemaining = ABILITIES.PRIMARY_FIRE.COOLDOWN_MS;
  }

  updateCooldowns(players: Map<PlayerId, PlayerState>, currentTick: number): void {
    const cooldownTicks = cooldownMsToTicks(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS);

    for (const player of players.values()) {
      const ticksSinceLastFire = currentTick - player.abilities.primaryFire.lastUsed;

      if (ticksSinceLastFire >= cooldownTicks) {
        player.abilities.primaryFire.ready = true;
        player.abilities.primaryFire.cooldownRemaining = 0;
      } else {
        player.abilities.primaryFire.ready = false;
        const remainingTicks = cooldownTicks - ticksSinceLastFire;
        player.abilities.primaryFire.cooldownRemaining = ticksToMs(remainingTicks);
      }
    }
  }

  private checkArenaCollision(projectile: ProjectileState): boolean {
    const pos = projectile.position;
    const radius = projectile.radius;

    // Check walls
    for (const wall of ARENA_COLLISION.walls) {
      if (sphereOverlapsAABB(pos, radius, wall)) {
        return true;
      }
    }

    // Check platforms
    for (const platform of ARENA_COLLISION.platforms) {
      if (sphereOverlapsAABB(pos, radius, platform)) {
        return true;
      }
    }

    // Check cylinders (pillars)
    for (const cylinder of ARENA_COLLISION.cylinders) {
      if (sphereOverlapsCylinder(pos, radius, cylinder)) {
        return true;
      }
    }

    return false;
  }
}
