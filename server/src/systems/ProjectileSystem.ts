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
} from '@wizard-zone/shared';

export class ProjectileSystem {
  createProjectile(
    owner: PlayerState,
    tick: number
  ): ProjectileState {
    // Calculate spawn position (in front of player at eye level)
    const spawnDistance = 1.0;
    const eyeHeight = 0.9; // Relative to player position

    // Direction from yaw and pitch
    // In Three.js with Euler order 'YXZ':
    // - yaw rotates around Y axis (positive = left/counter-clockwise from above)
    // - pitch rotates around X axis (positive = look up)
    // Camera default looks down -Z
    //
    // The forward direction vector for a camera with yaw and pitch:
    // We need to negate pitch because in our system positive pitch = looking up
    // but in spherical coordinates, we want negative Y component when looking up
    const cosPitch = Math.cos(owner.pitch);
    const sinPitch = Math.sin(owner.pitch);
    const cosYaw = Math.cos(owner.yaw);
    const sinYaw = Math.sin(owner.yaw);

    // Forward direction (where camera is looking)
    // At yaw=0, pitch=0: looking down -Z
    // At yaw=PI/2, pitch=0: looking down -X
    // At yaw=0, pitch=PI/4: looking up and forward (-Z, +Y)
    const dirX = -sinYaw * cosPitch;
    const dirY = sinPitch;
    const dirZ = -cosYaw * cosPitch;

    // Direction is already normalized (it's on a unit sphere)
    const normalizedDirX = dirX;
    const normalizedDirY = dirY;
    const normalizedDirZ = dirZ;

    const projectile: ProjectileState = {
      id: uuidv4(),
      type: ProjectileType.FIREBALL,
      ownerId: owner.id,
      position: {
        x: owner.position.x + normalizedDirX * spawnDistance,
        y: owner.position.y + eyeHeight + normalizedDirY * spawnDistance,
        z: owner.position.z + normalizedDirZ * spawnDistance,
      },
      velocity: {
        x: normalizedDirX * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
        y: normalizedDirY * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
        z: normalizedDirZ * ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED,
      },
      createdAt: tick,
      lifetime: Math.ceil(ABILITIES.PRIMARY_FIRE.LIFETIME_MS / (1000 / 60)), // Convert to ticks
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
    const cooldownTicks = Math.ceil(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS / (1000 / 60));
    const ticksSinceLastFire = currentTick - player.abilities.primaryFire.lastUsed;
    return ticksSinceLastFire >= cooldownTicks || player.abilities.primaryFire.lastUsed === 0;
  }

  recordFire(player: PlayerState, currentTick: number): void {
    player.abilities.primaryFire.lastUsed = currentTick;
    player.abilities.primaryFire.ready = false;
    player.abilities.primaryFire.cooldownRemaining = ABILITIES.PRIMARY_FIRE.COOLDOWN_MS;
  }

  updateCooldowns(players: Map<PlayerId, PlayerState>, currentTick: number): void {
    const cooldownTicks = Math.ceil(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS / (1000 / 60));

    for (const player of players.values()) {
      const ticksSinceLastFire = currentTick - player.abilities.primaryFire.lastUsed;

      if (ticksSinceLastFire >= cooldownTicks) {
        player.abilities.primaryFire.ready = true;
        player.abilities.primaryFire.cooldownRemaining = 0;
      } else {
        player.abilities.primaryFire.ready = false;
        const remainingTicks = cooldownTicks - ticksSinceLastFire;
        player.abilities.primaryFire.cooldownRemaining = remainingTicks * (1000 / 60);
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
