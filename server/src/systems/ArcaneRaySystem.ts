import { PlayerState, PlayerId, Vec3, ABILITIES, PHYSICS, cooldownMsToTicks, getDirectionFromLook } from '@wizard-zone/shared';

export interface ArcaneRayResult {
  origin: Vec3;
  endpoint: Vec3;
  hitPlayerId: PlayerId | null;
  damage: number;
}

export class ArcaneRaySystem {
  /**
   * Fire an arcane ray hitscan from the caster.
   * Infinite range - hits first target in line of sight.
   * Returns result with origin, endpoint, and hit player (if any).
   * Returns null if on cooldown.
   */
  fireArcaneRay(
    caster: PlayerState,
    players: Map<PlayerId, PlayerState>,
    currentTick: number
  ): ArcaneRayResult | null {
    if (!this.canFire(caster, currentTick)) {
      return null;
    }

    // Record ability usage
    caster.abilities.arcaneRay.lastUsed = currentTick;
    caster.abilities.arcaneRay.ready = false;
    caster.abilities.arcaneRay.cooldownRemaining = ABILITIES.ARCANE_RAY.COOLDOWN_MS;

    // Calculate ray origin (eye level)
    const origin: Vec3 = {
      x: caster.position.x,
      y: caster.position.y + PHYSICS.PLAYER_HEIGHT / 2,
      z: caster.position.z,
    };

    // Calculate ray direction from yaw/pitch
    const direction = getDirectionFromLook(caster.yaw, caster.pitch);

    // Find closest hit player (no max range for hit detection - infinite)
    const hitResult = this.findClosestHit(origin, direction, caster.id, players);

    // Calculate endpoint
    let endpoint: Vec3;
    if (hitResult) {
      endpoint = {
        x: origin.x + direction.x * hitResult.distance,
        y: origin.y + direction.y * hitResult.distance,
        z: origin.z + direction.z * hitResult.distance,
      };
    } else {
      // No hit - beam goes to visual max range
      endpoint = {
        x: origin.x + direction.x * ABILITIES.ARCANE_RAY.RANGE,
        y: origin.y + direction.y * ABILITIES.ARCANE_RAY.RANGE,
        z: origin.z + direction.z * ABILITIES.ARCANE_RAY.RANGE,
      };
    }

    return {
      origin,
      endpoint,
      hitPlayerId: hitResult?.playerId ?? null,
      damage: ABILITIES.ARCANE_RAY.DAMAGE,
    };
  }

  private canFire(caster: PlayerState, currentTick: number): boolean {
    const cooldownTicks = cooldownMsToTicks(ABILITIES.ARCANE_RAY.COOLDOWN_MS);
    const ticksSinceLastUse = currentTick - caster.abilities.arcaneRay.lastUsed;
    return ticksSinceLastUse >= cooldownTicks;
  }

  /**
   * Find the closest player hit by the ray (infinite range).
   */
  private findClosestHit(
    origin: Vec3,
    direction: Vec3,
    casterId: PlayerId,
    players: Map<PlayerId, PlayerState>
  ): { playerId: PlayerId; distance: number } | null {
    let closestHit: { playerId: PlayerId; distance: number } | null = null;

    for (const [playerId, player] of players) {
      // Skip self
      if (playerId === casterId) {
        continue;
      }

      // Skip dead players
      if (!player.isAlive) {
        continue;
      }

      // Check ray intersection with player hitbox (cylinder)
      const hitDistance = this.rayIntersectsPlayer(origin, direction, player);

      if (hitDistance === null) {
        continue;
      }

      // No max range check - infinite range
      // Check if this is the closest hit
      if (closestHit === null || hitDistance < closestHit.distance) {
        closestHit = { playerId, distance: hitDistance };
      }
    }

    return closestHit;
  }

  /**
   * Check if a ray intersects a player's hitbox (cylinder).
   * Returns the distance to intersection, or null if no hit.
   */
  private rayIntersectsPlayer(
    origin: Vec3,
    direction: Vec3,
    player: PlayerState
  ): number | null {
    const playerRadius = PHYSICS.PLAYER_RADIUS;
    const playerHeight = PHYSICS.PLAYER_HEIGHT;

    // Player cylinder bottom and top Y
    const cylinderBottomY = player.position.y - playerHeight / 2;
    const cylinderTopY = player.position.y + playerHeight / 2;
    const cylinderCenterX = player.position.x;
    const cylinderCenterZ = player.position.z;

    // Solve ray-cylinder intersection in XZ plane
    const dx = origin.x - cylinderCenterX;
    const dz = origin.z - cylinderCenterZ;

    const a = direction.x * direction.x + direction.z * direction.z;
    const b = 2 * (dx * direction.x + dz * direction.z);
    const c = dx * dx + dz * dz - playerRadius * playerRadius;

    // Handle edge case: ray is parallel to cylinder axis
    if (Math.abs(a) < 0.0001) {
      if (c > 0) {
        return null;
      }
      if (Math.abs(direction.y) < 0.0001) {
        return null;
      }
      const tBottom = (cylinderBottomY - origin.y) / direction.y;
      const tTop = (cylinderTopY - origin.y) / direction.y;
      const tNear = Math.min(tBottom, tTop);
      const tFar = Math.max(tBottom, tTop);
      if (tFar < 0) return null;
      return tNear > 0 ? tNear : tFar;
    }

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    const tNear = Math.min(t1, t2);
    const tFar = Math.max(t1, t2);

    // Check both intersection points
    for (const t of [tNear, tFar]) {
      if (t < 0) continue;

      const hitY = origin.y + t * direction.y;

      if (hitY >= cylinderBottomY && hitY <= cylinderTopY) {
        return t;
      }
    }

    // Check cap intersections
    const capHitDistance = this.checkCylinderCaps(
      origin,
      direction,
      cylinderCenterX,
      cylinderCenterZ,
      cylinderBottomY,
      cylinderTopY,
      playerRadius
    );

    return capHitDistance;
  }

  /**
   * Check if ray intersects the top or bottom caps of a cylinder.
   */
  private checkCylinderCaps(
    origin: Vec3,
    direction: Vec3,
    centerX: number,
    centerZ: number,
    bottomY: number,
    topY: number,
    radius: number
  ): number | null {
    let closestCapHit: number | null = null;

    if (Math.abs(direction.y) > 0.0001) {
      // Check bottom cap
      const tBottom = (bottomY - origin.y) / direction.y;
      if (tBottom > 0) {
        const hitX = origin.x + tBottom * direction.x;
        const hitZ = origin.z + tBottom * direction.z;
        const distSq = (hitX - centerX) ** 2 + (hitZ - centerZ) ** 2;
        if (distSq <= radius * radius) {
          if (closestCapHit === null || tBottom < closestCapHit) {
            closestCapHit = tBottom;
          }
        }
      }

      // Check top cap
      const tTop = (topY - origin.y) / direction.y;
      if (tTop > 0) {
        const hitX = origin.x + tTop * direction.x;
        const hitZ = origin.z + tTop * direction.z;
        const distSq = (hitX - centerX) ** 2 + (hitZ - centerZ) ** 2;
        if (distSq <= radius * radius) {
          if (closestCapHit === null || tTop < closestCapHit) {
            closestCapHit = tTop;
          }
        }
      }
    }

    return closestCapHit;
  }
}
