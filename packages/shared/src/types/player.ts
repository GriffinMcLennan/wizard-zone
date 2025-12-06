import type { Vec3 } from './vectors.js';

export type PlayerId = string;

export interface AbilityCooldown {
  ready: boolean;
  cooldownRemaining: number;
  lastUsed: number;
}

export interface AbilityState {
  dash: AbilityCooldown;
  launchJump: AbilityCooldown;
  primaryFire: AbilityCooldown;
  novaBlast: AbilityCooldown;
  arcaneRay: AbilityCooldown;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isGrounded: boolean;
  abilities: AbilityState;
  lastProcessedInput: number;
}

// Use a large negative number to ensure abilities are always ready on spawn
// This guarantees (currentTick - lastUsed) will exceed any cooldown
const NEVER_USED = -100000;

export function createDefaultAbilityState(): AbilityState {
  return {
    dash: { ready: true, cooldownRemaining: 0, lastUsed: NEVER_USED },
    launchJump: { ready: true, cooldownRemaining: 0, lastUsed: NEVER_USED },
    primaryFire: { ready: true, cooldownRemaining: 0, lastUsed: NEVER_USED },
    novaBlast: { ready: true, cooldownRemaining: 0, lastUsed: NEVER_USED },
    arcaneRay: { ready: true, cooldownRemaining: 0, lastUsed: NEVER_USED },
  };
}

export function createDefaultPlayerState(id: PlayerId, name: string): PlayerState {
  return {
    id,
    name,
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    health: 100,
    maxHealth: 100,
    isAlive: true,
    isGrounded: true,
    abilities: createDefaultAbilityState(),
    lastProcessedInput: 0,
  };
}
