import { HealthRegenSystem } from '../../src/systems/HealthRegenSystem.js';
import { PlayerState, PlayerId, createDefaultPlayerState, PLAYER, NETWORK } from '@wizard-zone/shared';

describe('HealthRegenSystem', () => {
  let healthRegenSystem: HealthRegenSystem;
  let players: Map<PlayerId, PlayerState>;
  const deltaSeconds = NETWORK.TICK_INTERVAL_MS / 1000;
  const delayTicks = Math.ceil(PLAYER.HEALTH_REGEN.DELAY_MS / NETWORK.TICK_INTERVAL_MS);

  beforeEach(() => {
    healthRegenSystem = new HealthRegenSystem();
    players = new Map();
  });

  function createPlayer(id: string, health: number, lastDamageTick: number): PlayerState {
    const player = createDefaultPlayerState(id, `Player ${id}`);
    player.health = health;
    player.lastDamageTick = lastDamageTick;
    return player;
  }

  describe('health regeneration', () => {
    it('should not regenerate health before delay has passed', () => {
      const player = createPlayer('1', 50, 100);
      players.set('1', player);

      // Current tick is within delay period
      const currentTick = 100 + delayTicks - 1;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      expect(player.health).toBe(50);
    });

    it('should regenerate health after delay has passed', () => {
      const player = createPlayer('1', 50, 100);
      players.set('1', player);

      // Current tick is past delay period
      const currentTick = 100 + delayTicks;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      const expectedRegen = PLAYER.HEALTH_REGEN.RATE_PER_SECOND * deltaSeconds;
      expect(player.health).toBeCloseTo(50 + expectedRegen, 5);
    });

    it('should regenerate at the correct rate per second', () => {
      const player = createPlayer('1', 50, 0);
      players.set('1', player);

      // Simulate 1 second of regeneration (60 ticks at 60Hz)
      const ticksPerSecond = 1000 / NETWORK.TICK_INTERVAL_MS;
      let currentTick = delayTicks;

      for (let i = 0; i < ticksPerSecond; i++) {
        healthRegenSystem.update(players, currentTick + i, deltaSeconds);
      }

      // After 1 second, should have regenerated RATE_PER_SECOND HP
      expect(player.health).toBeCloseTo(50 + PLAYER.HEALTH_REGEN.RATE_PER_SECOND, 1);
    });

    it('should cap health at maxHealth', () => {
      const player = createPlayer('1', 98, 0);
      players.set('1', player);

      // Current tick is well past delay period
      const currentTick = delayTicks + 1000;

      // Regenerate multiple times
      for (let i = 0; i < 100; i++) {
        healthRegenSystem.update(players, currentTick + i, deltaSeconds);
      }

      expect(player.health).toBe(player.maxHealth);
    });

    it('should not regenerate if already at full health', () => {
      const player = createPlayer('1', 100, 0);
      players.set('1', player);

      const currentTick = delayTicks + 100;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      expect(player.health).toBe(100);
    });

    it('should not regenerate dead players', () => {
      const player = createPlayer('1', 0, 0);
      player.isAlive = false;
      players.set('1', player);

      const currentTick = delayTicks + 100;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      expect(player.health).toBe(0);
    });
  });

  describe('damage reset behavior', () => {
    it('should not regenerate if damage was taken within delay period', () => {
      const player = createPlayer('1', 50, 0);
      players.set('1', player);

      // Start regenerating
      let currentTick = delayTicks;
      healthRegenSystem.update(players, currentTick, deltaSeconds);
      const healthAfterFirstRegen = player.health;
      expect(healthAfterFirstRegen).toBeGreaterThan(50);

      // Simulate taking damage (updates lastDamageTick)
      player.lastDamageTick = currentTick + 1;
      player.health = 40;

      // Try to regenerate immediately after damage
      currentTick = player.lastDamageTick + 10; // Only 10 ticks after damage
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      // Health should not have regenerated
      expect(player.health).toBe(40);
    });

    it('should resume regeneration after delay passes since last damage', () => {
      const player = createPlayer('1', 50, 0);
      players.set('1', player);

      // Take damage at tick 100
      player.lastDamageTick = 100;
      player.health = 40;

      // Wait for delay to pass
      const currentTick = 100 + delayTicks;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      // Should regenerate now
      expect(player.health).toBeGreaterThan(40);
    });
  });

  describe('multiple players', () => {
    it('should regenerate multiple players independently', () => {
      // Player 1: took damage recently, should not regen
      const player1 = createPlayer('1', 50, 100);
      players.set('1', player1);

      // Player 2: took damage long ago, should regen
      const player2 = createPlayer('2', 50, 0);
      players.set('2', player2);

      // Player 3: full health, should not change
      const player3 = createPlayer('3', 100, 0);
      players.set('3', player3);

      const currentTick = 100 + delayTicks - 1; // Just before player1's delay ends
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      expect(player1.health).toBe(50); // No regen (delay not passed)
      expect(player2.health).toBeGreaterThan(50); // Regenerated
      expect(player3.health).toBe(100); // Full health, no change
    });
  });

  describe('edge cases', () => {
    it('should handle lastDamageTick of 0 (never damaged)', () => {
      const player = createPlayer('1', 80, 0);
      players.set('1', player);

      // Even at tick 1, if lastDamageTick is 0 and delay has passed, should regen
      const currentTick = delayTicks;
      healthRegenSystem.update(players, currentTick, deltaSeconds);

      expect(player.health).toBeGreaterThan(80);
    });

    it('should handle empty player map', () => {
      // Should not throw
      expect(() => {
        healthRegenSystem.update(players, 1000, deltaSeconds);
      }).not.toThrow();
    });

    it('should regenerate exactly to maxHealth, not beyond', () => {
      const player = createPlayer('1', 99.9, 0);
      players.set('1', player);

      // Regenerate many times to ensure we hit the cap
      const currentTick = delayTicks + 100;
      for (let i = 0; i < 100; i++) {
        healthRegenSystem.update(players, currentTick + i, deltaSeconds);
      }

      expect(player.health).toBeLessThanOrEqual(player.maxHealth);
      expect(player.health).toBe(player.maxHealth);
    });
  });
});
