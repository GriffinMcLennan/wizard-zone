import { NETWORK } from '../constants/network.js';
import { Vec3 } from '../types/vectors.js';
import { AbilityCooldown } from '../types/player.js';

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
 * Works correctly with NEVER_USED (-100000) initialization since
 * (currentTick - NEVER_USED) will always exceed any cooldown.
 */
export function isAbilityReady(
  lastUsed: number,
  cooldownMs: number,
  currentTick: number
): boolean {
  const cooldownTicks = cooldownMsToTicks(cooldownMs);
  const ticksSinceLastUse = currentTick - lastUsed;
  return ticksSinceLastUse >= cooldownTicks;
}

/**
 * Record that an ability was just used.
 * Sets lastUsed to current tick, ready to false, and cooldownRemaining to full cooldown.
 */
export function recordAbilityUse(
  ability: AbilityCooldown,
  cooldownMs: number,
  currentTick: number
): void {
  ability.lastUsed = currentTick;
  ability.ready = false;
  ability.cooldownRemaining = cooldownMs;
}

/**
 * Update ability cooldown state for UI display.
 * Calculates ready state and remaining time in milliseconds.
 */
export function updateAbilityCooldown(
  ability: AbilityCooldown,
  cooldownMs: number,
  currentTick: number
): void {
  const cooldownTicks = cooldownMsToTicks(cooldownMs);
  const ticksSince = currentTick - ability.lastUsed;

  if (ticksSince >= cooldownTicks) {
    ability.ready = true;
    ability.cooldownRemaining = 0;
  } else {
    ability.ready = false;
    ability.cooldownRemaining = ticksToMs(cooldownTicks - ticksSince);
  }
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
