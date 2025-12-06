import { ArenaCollisionData, CollisionAABB, CollisionCylinder } from '../types/collision.js';

const ARENA_SIZE = 60;

// Helper to create AABB from center position and size
function createAABB(
  position: [number, number, number],
  size: [number, number, number]
): CollisionAABB {
  const [cx, cy, cz] = position;
  const [w, h, d] = size;
  return {
    type: 'aabb',
    min: { x: cx - w / 2, y: cy - h / 2, z: cz - d / 2 },
    max: { x: cx + w / 2, y: cy + h / 2, z: cz + d / 2 },
  };
}

// Helper to create cylinder from position, height, and radius
function createCylinder(
  position: [number, number, number],
  height: number,
  radius: number
): CollisionCylinder {
  return {
    type: 'cylinder',
    center: { x: position[0], y: 0, z: position[2] },
    radius: radius,
    height: height,
  };
}

// Arena boundary walls (solid blockers)
const walls: CollisionAABB[] = [
  // North wall (negative Z)
  createAABB([0, 2, -ARENA_SIZE / 2], [ARENA_SIZE, 4, 1]),
  // South wall (positive Z)
  createAABB([0, 2, ARENA_SIZE / 2], [ARENA_SIZE, 4, 1]),
  // West wall (negative X)
  createAABB([-ARENA_SIZE / 2, 2, 0], [1, 4, ARENA_SIZE]),
  // East wall (positive X)
  createAABB([ARENA_SIZE / 2, 2, 0], [1, 4, ARENA_SIZE]),

  // Cover obstacles in open areas (block horizontal movement)
  createAABB([-12, 0.75, 0], [2, 1.5, 4]),
  createAABB([12, 0.75, 0], [2, 1.5, 4]),
  createAABB([0, 0.75, -12], [4, 1.5, 2]),
  createAABB([0, 0.75, 12], [4, 1.5, 2]),
];

// Platforms (landable surfaces - you can land on from above)
const platforms: CollisionAABB[] = [
  // Thin platform caps on top of cover obstacles (surface at Y=1.5)
  createAABB([-12, 1.5, 0], [2, 0.1, 4]),
  createAABB([12, 1.5, 0], [2, 0.1, 4]),
  createAABB([0, 1.5, -12], [4, 0.1, 2]),
  createAABB([0, 1.5, 12], [4, 0.1, 2]),

  // Central elevated platform (Y=2, height=0.5)
  createAABB([0, 2, 0], [12, 0.5, 12]),

  // Corner platforms - lower level (Y=1.5)
  createAABB([-20, 1.5, -20], [8, 0.5, 8]),
  createAABB([20, 1.5, -20], [8, 0.5, 8]),
  createAABB([-20, 1.5, 20], [8, 0.5, 8]),
  createAABB([20, 1.5, 20], [8, 0.5, 8]),

  // Corner platforms - upper level (Y=4)
  createAABB([-20, 4, -20], [5, 0.5, 5]),
  createAABB([20, 4, -20], [5, 0.5, 5]),
  createAABB([-20, 4, 20], [5, 0.5, 5]),
  createAABB([20, 4, 20], [5, 0.5, 5]),

  // Side platforms (Y=2.5)
  createAABB([-20, 2.5, 0], [6, 0.5, 10]),
  createAABB([20, 2.5, 0], [6, 0.5, 10]),
  createAABB([0, 2.5, -20], [10, 0.5, 6]),
  createAABB([0, 2.5, 20], [10, 0.5, 6]),

  // Floating platforms - high level (Y=5)
  createAABB([-10, 5, -10], [4, 0.5, 4]),
  createAABB([10, 5, -10], [4, 0.5, 4]),
  createAABB([-10, 5, 10], [4, 0.5, 4]),
  createAABB([10, 5, 10], [4, 0.5, 4]),

  // Central tower platform (Y=6)
  createAABB([0, 6, 0], [6, 0.5, 6]),
];

// Decorative pillars (cylinders)
const cylinders: CollisionCylinder[] = [
  createCylinder([-6, 0, -6], 6, 0.5),
  createCylinder([6, 0, -6], 6, 0.5),
  createCylinder([-6, 0, 6], 6, 0.5),
  createCylinder([6, 0, 6], 6, 0.5),
];

// Complete arena collision data
export const ARENA_COLLISION: ArenaCollisionData = {
  platforms,
  cylinders,
  walls,
};

// Export arena size constant
export const ARENA_BOUNDS = ARENA_SIZE / 2;
