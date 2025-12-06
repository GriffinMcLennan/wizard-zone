import {
  PlayerState,
  ProjectileState,
  PlayerId,
  PHYSICS,
} from '@wizard-zone/shared';

export interface CollisionResult {
  projectileId: string;
  playerId: PlayerId;
  ownerId: PlayerId;
  damage: number;
}

export class CollisionSystem {
  /**
   * Check for projectile-player collisions
   * Returns list of hits (projectile destroyed, player takes damage)
   */
  checkProjectileCollisions(
    players: Map<PlayerId, PlayerState>,
    projectiles: Map<string, ProjectileState>
  ): CollisionResult[] {
    const hits: CollisionResult[] = [];

    for (const [projectileId, projectile] of projectiles) {
      for (const [playerId, player] of players) {
        // Skip if projectile belongs to this player
        if (projectile.ownerId === playerId) continue;

        // Skip dead players
        if (!player.isAlive) continue;

        // Check sphere-capsule collision (simplified to sphere-sphere)
        if (this.checkProjectilePlayerCollision(projectile, player)) {
          hits.push({
            projectileId,
            playerId,
            ownerId: projectile.ownerId,
            damage: projectile.damage,
          });
          // Each projectile can only hit one player
          break;
        }
      }
    }

    return hits;
  }

  /**
   * Check collision between a projectile (sphere) and player (capsule/sphere approximation)
   */
  private checkProjectilePlayerCollision(
    projectile: ProjectileState,
    player: PlayerState
  ): boolean {
    // Player hitbox: treat as a sphere centered at player position
    // This is a simplification - could use capsule for more accuracy
    const playerRadius = PHYSICS.PLAYER_RADIUS;
    const playerCenterY = player.position.y + PHYSICS.PLAYER_HEIGHT / 2 - playerRadius;

    // Distance between projectile and player center
    const dx = projectile.position.x - player.position.x;
    const dy = projectile.position.y - playerCenterY;
    const dz = projectile.position.z - player.position.z;

    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const minDistance = projectile.radius + playerRadius;

    return distanceSquared <= minDistance * minDistance;
  }

  /**
   * Push overlapping players apart
   */
  resolvePlayerCollisions(players: Map<PlayerId, PlayerState>): void {
    const playerArray = Array.from(players.values()).filter((p) => p.isAlive);

    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        const a = playerArray[i];
        const b = playerArray[j];

        if (a && b) {
          this.resolvePlayerPairCollision(a, b);
        }
      }
    }
  }

  private resolvePlayerPairCollision(a: PlayerState, b: PlayerState): void {
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = PHYSICS.PLAYER_RADIUS * 2;

    if (dist < minDist && dist > 0.001) {
      // Calculate overlap and push direction
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const nz = dz / dist;

      // Push both players apart equally
      a.position.x -= nx * overlap;
      a.position.z -= nz * overlap;
      b.position.x += nx * overlap;
      b.position.z += nz * overlap;
    }
  }
}
