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
   * Resolve all arena collisions for a player.
   * 1. Horizontal blocking (walls, platforms, cylinders)
   * 2. Platform/cylinder landing (when falling)
   * 3. Ceiling collision (when jumping)
   * 4. Ground fallback
   */
  resolveCollisions(position: Vec3, velocity: Vec3): CollisionResult {
    let { x, y, z } = position;
    let { x: vx, y: vy, z: vz } = velocity;
    let isGrounded = false;

    const feetY = y - this.playerHeight / 2;

    // 1. HORIZONTAL BLOCKING
    // Walls
    for (const wall of ARENA_COLLISION.walls) {
      const result = resolveWallCollision(x, z, feetY, this.playerHeight, this.playerRadius, wall);
      if (result.collided) { x = result.x; z = result.z; }
    }
    // Platforms (cover obstacles etc.)
    for (const platform of ARENA_COLLISION.platforms) {
      const result = resolveWallCollision(x, z, feetY, this.playerHeight, this.playerRadius, platform);
      if (result.collided) { x = result.x; z = result.z; }
    }
    // Cylinders (pillars)
    for (const cylinder of ARENA_COLLISION.cylinders) {
      if (feetY < cylinder.height) {
        const result = resolveCylinderCollision(x, z, this.playerRadius, cylinder);
        if (result.collided) { x = result.x; z = result.z; }
      }
    }

    // 2. LANDING (only when falling)
    if (vy <= 0) {
      let landingSurface: number | null = null;

      // Check platforms
      for (const platform of ARENA_COLLISION.platforms) {
        if (circleOverlapsAABBXZ(x, z, this.playerRadius, platform)) {
          const surfaceY = platform.max.y;
          const fellThrough = feetY < surfaceY && feetY > platform.min.y;
          const nearSurface = feetY >= surfaceY && feetY <= surfaceY + 0.5;
          if ((fellThrough || nearSurface) && (landingSurface === null || surfaceY > landingSurface)) {
            landingSurface = surfaceY;
          }
        }
      }

      // Check cylinder tops
      for (const cylinder of ARENA_COLLISION.cylinders) {
        const dx = x - cylinder.center.x;
        const dz = z - cylinder.center.z;
        const dist = dx * dx + dz * dz;
        const maxDist = (cylinder.radius + this.playerRadius) ** 2;
        if (dist <= maxDist) {
          const surfaceY = cylinder.height;
          const nearSurface = feetY >= surfaceY && feetY <= surfaceY + 0.5;
          if (nearSurface && (landingSurface === null || surfaceY > landingSurface)) {
            landingSurface = surfaceY;
          }
        }
      }

      if (landingSurface !== null) {
        y = landingSurface + this.playerHeight / 2;
        vy = 0;
        isGrounded = true;
      }
    }

    // 3. CEILING (stop upward movement)
    if (vy > 0) {
      const headY = feetY + this.playerHeight;
      for (const platform of ARENA_COLLISION.platforms) {
        if (circleOverlapsAABBXZ(x, z, this.playerRadius, platform)) {
          if (headY > platform.min.y && feetY < platform.min.y) {
            vy = 0;
            break;
          }
        }
      }
    }

    // 4. GROUND FALLBACK
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
