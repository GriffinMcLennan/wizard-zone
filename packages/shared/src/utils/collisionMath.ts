import { CollisionAABB, CollisionCylinder } from '../types/index.js';

// Check if a circle (player XZ footprint) overlaps an AABB in XZ plane
export function circleOverlapsAABBXZ(
  x: number,
  z: number,
  radius: number,
  aabb: CollisionAABB
): boolean {
  // Find closest point on AABB to the circle center
  const closestX = Math.max(aabb.min.x, Math.min(x, aabb.max.x));
  const closestZ = Math.max(aabb.min.z, Math.min(z, aabb.max.z));

  // Calculate distance from circle center to closest point
  const distX = x - closestX;
  const distZ = z - closestZ;
  const distSquared = distX * distX + distZ * distZ;

  return distSquared <= radius * radius;
}

// Check cylinder collision and push player out if colliding
export function resolveCylinderCollision(
  x: number,
  z: number,
  radius: number,
  cylinder: CollisionCylinder
): { x: number; z: number; collided: boolean } {
  const dx = x - cylinder.center.x;
  const dz = z - cylinder.center.z;
  const distSquared = dx * dx + dz * dz;
  const minDist = radius + cylinder.radius;

  if (distSquared < minDist * minDist && distSquared > 0.0001) {
    // Collision! Push player out
    const dist = Math.sqrt(distSquared);
    const pushX = (dx / dist) * minDist;
    const pushZ = (dz / dist) * minDist;

    return {
      x: cylinder.center.x + pushX,
      z: cylinder.center.z + pushZ,
      collided: true,
    };
  }

  return { x, z, collided: false };
}

// Check wall/obstacle collision and push player out (solid blocking)
// Only blocks if player's vertical extent intersects the wall's vertical extent
export function resolveWallCollision(
  x: number,
  z: number,
  feetY: number,
  playerHeight: number,
  radius: number,
  wall: CollisionAABB
): { x: number; z: number; collided: boolean } {
  const headY = feetY + playerHeight;

  // First check Y overlap - player must vertically intersect the wall
  if (headY <= wall.min.y || feetY >= wall.max.y) {
    // No vertical overlap - player is above or below the wall
    return { x, z, collided: false };
  }

  // Find closest point on wall to player center (in XZ)
  const closestX = Math.max(wall.min.x, Math.min(x, wall.max.x));
  const closestZ = Math.max(wall.min.z, Math.min(z, wall.max.z));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSquared = dx * dx + dz * dz;

  if (distSquared < radius * radius && distSquared > 0.0001) {
    // Push player out of wall
    const dist = Math.sqrt(distSquared);
    const pushX = (dx / dist) * radius;
    const pushZ = (dz / dist) * radius;

    return {
      x: closestX + pushX,
      z: closestZ + pushZ,
      collided: true,
    };
  }

  return { x, z, collided: false };
}
