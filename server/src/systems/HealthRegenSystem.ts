import { PlayerState, PlayerId, PLAYER, NETWORK } from '@wizard-zone/shared';

export class HealthRegenSystem {
  private readonly delayTicks: number;

  constructor() {
    this.delayTicks = Math.ceil(
      PLAYER.HEALTH_REGEN.DELAY_MS / NETWORK.TICK_INTERVAL_MS
    );
  }

  update(
    players: Map<PlayerId, PlayerState>,
    currentTick: number,
    deltaSeconds: number
  ): void {
    for (const player of players.values()) {
      if (!player.isAlive) continue;
      if (player.health >= player.maxHealth) continue;

      const ticksSinceDamage = currentTick - player.lastDamageTick;
      if (ticksSinceDamage < this.delayTicks) continue;

      const regenAmount = PLAYER.HEALTH_REGEN.RATE_PER_SECOND * deltaSeconds;
      player.health = Math.min(player.health + regenAmount, player.maxHealth);
    }
  }
}
