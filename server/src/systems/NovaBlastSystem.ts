import { PlayerState, PlayerId, Vec3, ABILITIES, isAbilityReady, recordAbilityUse } from '@wizard-zone/shared';

export interface NovaBlastResult {
  casterId: PlayerId;
  casterPosition: Vec3;
  hitPlayerIds: PlayerId[];
  damage: number;
}

export class NovaBlastSystem {
  /**
   * Fire a nova blast AOE centered on the caster.
   * Returns result with hit players, or null if on cooldown.
   */
  fireNovaBlast(
    caster: PlayerState,
    players: Map<PlayerId, PlayerState>,
    currentTick: number
  ): NovaBlastResult | null {
    if (!isAbilityReady(caster.abilities.novaBlast.lastUsed, ABILITIES.NOVA_BLAST.COOLDOWN_MS, currentTick)) {
      return null;
    }

    recordAbilityUse(caster.abilities.novaBlast, ABILITIES.NOVA_BLAST.COOLDOWN_MS, currentTick);

    // Find all players within radius
    const hitPlayerIds: PlayerId[] = [];
    const radiusSq = ABILITIES.NOVA_BLAST.RADIUS * ABILITIES.NOVA_BLAST.RADIUS;

    for (const [playerId, player] of players) {
      // Skip self
      if (playerId === caster.id) {
        continue;
      }

      // Skip dead players
      if (!player.isAlive) {
        continue;
      }

      // Calculate 3D distance squared
      const dx = player.position.x - caster.position.x;
      const dy = player.position.y - caster.position.y;
      const dz = player.position.z - caster.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSq) {
        hitPlayerIds.push(playerId);
      }
    }

    return {
      casterId: caster.id,
      casterPosition: { ...caster.position },
      hitPlayerIds,
      damage: ABILITIES.NOVA_BLAST.DAMAGE,
    };
  }
}
