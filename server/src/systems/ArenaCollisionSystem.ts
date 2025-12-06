import {
  ARENA_COLLISION,
  PHYSICS,
  CollisionResult,
  Vec3,
  circleOverlapsAABBXZ,
  resolveCylinderCollision,
  resolveWallCollision,
} from '@wizard-zone/shared';

export class ArenaCollisionSystem {
  private readonly playerRadius = PHYSICS.PLAYER_RADIUS;
  private readonly playerHeight = PHYSICS.PLAYER_HEIGHT;

  /**
   * Resolve all arena collisions for a player
   * Simple algorithm:
   * 1. Push player out of walls/obstacles (horizontal blocking)
   * 2. Push player out of cylinders
   * 3. Land on platforms only when falling through from above
   * 4. Fall to ground (Y=0) as last resort
   */
  resolveCollisions(
    position: Vec3,
    velocity: Vec3
  ): CollisionResult {
    let x = position.x;
    let y = position.y;
    let z = position.z;
    let vx = velocity.x;
    let vy = velocity.y;
    let vz = velocity.z;
    let isGrounded = false;

    // Player feet position (center Y minus half height)
    const feetY = y - this.playerHeight / 2;

    // 1. WALL BLOCKING: Push player out of solid walls/obstacles
    for (const wall of ARENA_COLLISION.walls) {
      const result = resolveWallCollision(
        x, z, feetY, this.playerHeight, this.playerRadius, wall
      );
      if (result.collided) {
        x = result.x;
        z = result.z;
      }
    }

    // 2. CYLINDER BLOCKING: Push player out of pillars
    for (const cylinder of ARENA_COLLISION.cylinders) {
      // Only collide if player is within cylinder height
      if (feetY < cylinder.height) {
        const result = resolveCylinderCollision(x, z, this.playerRadius, cylinder);
        if (result.collided) {
          x = result.x;
          z = result.z;
        }
      }
    }

    // 3. PLATFORM LANDING: Only land when falling (vy <= 0)
    if (vy <= 0) {
      let highestLandingSurface: number | null = null;

      for (const platform of ARENA_COLLISION.platforms) {
        // Check if player overlaps platform in XZ
        if (circleOverlapsAABBXZ(x, z, this.playerRadius, platform)) {
          const surfaceY = platform.max.y;

          // Landing condition: feet are above surface (or slightly below due to fast falling)
          // We land if: feet are above the surface OR feet fell through but are still above platform bottom
          const fellThrough = feetY < surfaceY && feetY > platform.min.y;
          const nearSurface = feetY >= surfaceY && feetY <= surfaceY + 0.5;

          if (fellThrough || nearSurface) {
            if (highestLandingSurface === null || surfaceY > highestLandingSurface) {
              highestLandingSurface = surfaceY;
            }
          }
        }
      }

      // Also check cylinder tops for landing
      for (const cylinder of ARENA_COLLISION.cylinders) {
        const dx = x - cylinder.center.x;
        const dz = z - cylinder.center.z;
        const distSquared = dx * dx + dz * dz;
        const landingRadius = cylinder.radius + this.playerRadius;

        // Player is within landing radius of cylinder top
        if (distSquared <= landingRadius * landingRadius) {
          const surfaceY = cylinder.height;
          // Same landing logic as platforms
          if (feetY >= surfaceY - 0.5 && feetY <= surfaceY + 0.3) {
            if (highestLandingSurface === null || surfaceY > highestLandingSurface) {
              highestLandingSurface = surfaceY;
            }
          }
        }
      }

      // Land on the highest valid surface (platform or cylinder top)
      if (highestLandingSurface !== null) {
        y = highestLandingSurface + this.playerHeight / 2;
        vy = 0;
        isGrounded = true;
      }
    }

    // 4. CEILING CHECK: Stop upward movement when hitting platform underside
    if (vy > 0) {
      const headY = feetY + this.playerHeight;
      for (const platform of ARENA_COLLISION.platforms) {
        if (circleOverlapsAABBXZ(x, z, this.playerRadius, platform)) {
          // Head hitting underside of platform
          if (headY > platform.min.y && feetY < platform.min.y) {
            vy = 0;
            break;
          }
        }
      }
    }

    // 5. GROUND CHECK: Fall to Y=0 as last resort
    const currentFeetY = y - this.playerHeight / 2;
    if (!isGrounded && currentFeetY <= PHYSICS.GROUND_LEVEL) {
      y = PHYSICS.GROUND_LEVEL + this.playerHeight / 2;
      vy = 0;
      isGrounded = true;
    }

    return {
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      isGrounded,
    };
  }
}
