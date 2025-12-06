import { NETWORK } from '../constants/network.js';
import { Vec3 } from '../types/vectors.js';

/**
 * Convert cooldown time in milliseconds to game ticks.
 */
export function cooldownMsToTicks(cooldownMs: number): number {
  return Math.ceil(cooldownMs / (1000 / NETWORK.TICK_RATE));
}

/**
 * Convert game ticks to milliseconds.
 */
export function ticksToMs(ticks: number): number {
  return ticks * (1000 / NETWORK.TICK_RATE);
}

/**
 * Check if an ability is off cooldown.
 */
export function isAbilityReady(
  lastUsed: number,
  cooldownMs: number,
  currentTick: number
): boolean {
  const cooldownTicks = cooldownMsToTicks(cooldownMs);
  const ticksSinceLastUse = currentTick - lastUsed;
  return lastUsed === 0 || ticksSinceLastUse >= cooldownTicks;
}

/**
 * Calculate direction vector from yaw and pitch angles.
 * Uses Three.js coordinate system:
 * - Forward = -Z
 * - Right = +X
 * - Up = +Y
 * - Yaw rotates around Y (positive = left/counter-clockwise from above)
 * - Pitch rotates around X (positive = look up)
 */
export function getDirectionFromLook(yaw: number, pitch: number): Vec3 {
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosPitch,
  };
}
