import { PlayerState, PlayerId, Vec3, ABILITIES, cooldownMsToTicks } from '@wizard-zone/shared';

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
    if (!this.canFire(caster, currentTick)) {
      return null;
    }

    // Record ability usage
    caster.abilities.novaBlast.lastUsed = currentTick;
    caster.abilities.novaBlast.ready = false;
    caster.abilities.novaBlast.cooldownRemaining = ABILITIES.NOVA_BLAST.COOLDOWN_MS;

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

  private canFire(caster: PlayerState, currentTick: number): boolean {
    const cooldownTicks = cooldownMsToTicks(ABILITIES.NOVA_BLAST.COOLDOWN_MS);
    const ticksSinceLastUse = currentTick - caster.abilities.novaBlast.lastUsed;
    const isFirstUse = caster.abilities.novaBlast.lastUsed === 0;

    return isFirstUse || ticksSinceLastUse >= cooldownTicks;
  }
}
