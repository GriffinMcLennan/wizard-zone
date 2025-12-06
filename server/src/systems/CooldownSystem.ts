import {
  PlayerState,
  PlayerId,
  ABILITIES,
  updateAbilityCooldown,
} from '@wizard-zone/shared';

/**
 * Mapping of ability names to their cooldown constants.
 * Single source of truth for all abilities.
 */
const ABILITY_COOLDOWNS = {
  dash: ABILITIES.DASH.COOLDOWN_MS,
  launchJump: ABILITIES.LAUNCH_JUMP.COOLDOWN_MS,
  primaryFire: ABILITIES.PRIMARY_FIRE.COOLDOWN_MS,
  novaBlast: ABILITIES.NOVA_BLAST.COOLDOWN_MS,
  arcaneRay: ABILITIES.ARCANE_RAY.COOLDOWN_MS,
} as const;

type AbilityName = keyof typeof ABILITY_COOLDOWNS;

/**
 * Centralized system for updating all ability cooldowns.
 * Replaces scattered cooldown update methods in PhysicsSystem and ProjectileSystem.
 */
export class CooldownSystem {
  /**
   * Update all ability cooldowns for all players.
   * Should be called once per tick after all abilities have been processed.
   */
  updateAllCooldowns(players: Map<PlayerId, PlayerState>, currentTick: number): void {
    for (const player of players.values()) {
      this.updatePlayerCooldowns(player, currentTick);
    }
  }

  /**
   * Update all ability cooldowns for a single player.
   */
  private updatePlayerCooldowns(player: PlayerState, currentTick: number): void {
    const abilities = player.abilities;

    for (const [abilityName, cooldownMs] of Object.entries(ABILITY_COOLDOWNS)) {
      const ability = abilities[abilityName as AbilityName];
      updateAbilityCooldown(ability, cooldownMs, currentTick);
    }
  }
}
