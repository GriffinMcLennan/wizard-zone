import { Vec3 } from './vectors.js';

// Axis-Aligned Bounding Box for platforms and obstacles
export interface CollisionAABB {
  type: 'aabb';
  min: Vec3;  // Minimum corner (x, y, z)
  max: Vec3;  // Maximum corner (x, y, z)
}

// Cylinder collision for pillars
export interface CollisionCylinder {
  type: 'cylinder';
  center: Vec3;  // Center at base (y=0)
  radius: number;
  height: number;
}

// Union type for all collision primitives
export type CollisionPrimitive = CollisionAABB | CollisionCylinder;

// Result from collision resolution
export interface CollisionResult {
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
}

// Arena collision data structure
export interface ArenaCollisionData {
  platforms: CollisionAABB[];  // Thin surfaces you can land on from above
  cylinders: CollisionCylinder[];  // Pillar obstacles
  walls: CollisionAABB[];  // Solid blockers (boundary walls + obstacles)
}
