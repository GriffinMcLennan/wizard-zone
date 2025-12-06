import { CooldownSystem } from '../../src/systems/CooldownSystem.js';
import {
  createDefaultPlayerState,
  ABILITIES,
  cooldownMsToTicks,
  NEVER_USED,
} from '@wizard-zone/shared';

describe('CooldownSystem', () => {
  let cooldownSystem: CooldownSystem;

  beforeEach(() => {
    cooldownSystem = new CooldownSystem();
  });

  describe('updateAllCooldowns', () => {
    it('should update all ability cooldowns for all players', () => {
      const player1 = createDefaultPlayerState('p1', 'Player1');
      const player2 = createDefaultPlayerState('p2', 'Player2');

      // Simulate abilities being used
      player1.abilities.dash.lastUsed = 100;
      player1.abilities.primaryFire.lastUsed = 95;
      player2.abilities.novaBlast.lastUsed = 90;

      const players = new Map([
        ['p1', player1],
        ['p2', player2],
      ]);

      cooldownSystem.updateAllCooldowns(players, 110);

      // Check player1 dash (on cooldown - 3000ms = 180 ticks, only 10 ticks passed)
      expect(player1.abilities.dash.ready).toBe(false);
      expect(player1.abilities.dash.cooldownRemaining).toBeGreaterThan(0);

      // Check player1 primaryFire (on cooldown - 500ms = 30 ticks, only 15 ticks passed)
      expect(player1.abilities.primaryFire.ready).toBe(false);

      // Check player2 novaBlast (on cooldown - 8000ms = 480 ticks, only 20 ticks passed)
      expect(player2.abilities.novaBlast.ready).toBe(false);
    });

    it('should mark abilities as ready when cooldown expires', () => {
      const player = createDefaultPlayerState('p1', 'Player1');
      player.abilities.dash.lastUsed = 100;
      player.abilities.dash.ready = false;
      player.abilities.dash.cooldownRemaining = ABILITIES.DASH.COOLDOWN_MS;

      const players = new Map([['p1', player]]);
      const cooldownTicks = cooldownMsToTicks(ABILITIES.DASH.COOLDOWN_MS);

      cooldownSystem.updateAllCooldowns(players, 100 + cooldownTicks);

      expect(player.abilities.dash.ready).toBe(true);
      expect(player.abilities.dash.cooldownRemaining).toBe(0);
    });

    it('should update all five abilities', () => {
      const player = createDefaultPlayerState('p1', 'Player1');

      // Use all abilities at tick 100
      player.abilities.dash.lastUsed = 100;
      player.abilities.launchJump.lastUsed = 100;
      player.abilities.primaryFire.lastUsed = 100;
      player.abilities.novaBlast.lastUsed = 100;
      player.abilities.arcaneRay.lastUsed = 100;

      const players = new Map([['p1', player]]);
      cooldownSystem.updateAllCooldowns(players, 110);

      // All should be on cooldown (only 10 ticks passed, all cooldowns are longer)
      expect(player.abilities.dash.ready).toBe(false);
      expect(player.abilities.launchJump.ready).toBe(false);
      expect(player.abilities.primaryFire.ready).toBe(false);
      expect(player.abilities.novaBlast.ready).toBe(false);
      expect(player.abilities.arcaneRay.ready).toBe(false);
    });

    it('should handle empty player map', () => {
      const players = new Map();
      expect(() => cooldownSystem.updateAllCooldowns(players, 100)).not.toThrow();
    });

    it('should work correctly with NEVER_USED initial value', () => {
      const player = createDefaultPlayerState('p1', 'Player1');
      // Default state uses NEVER_USED for lastUsed
      expect(player.abilities.dash.lastUsed).toBe(NEVER_USED);

      const players = new Map([['p1', player]]);
      cooldownSystem.updateAllCooldowns(players, 100);

      // Should be ready because (100 - (-100000)) is huge
      expect(player.abilities.dash.ready).toBe(true);
      expect(player.abilities.dash.cooldownRemaining).toBe(0);
    });

    it('should calculate correct cooldownRemaining in milliseconds', () => {
      const player = createDefaultPlayerState('p1', 'Player1');
      player.abilities.dash.lastUsed = 100;

      const players = new Map([['p1', player]]);

      // At tick 100, just used. Now check at tick 160 (60 ticks = 1 second passed)
      cooldownSystem.updateAllCooldowns(players, 160);

      // Dash cooldown is 3000ms. 60 ticks = 1000ms passed.
      // Remaining should be approximately 2000ms
      expect(player.abilities.dash.cooldownRemaining).toBeCloseTo(2000, -1);
    });

    it('should mark ability ready exactly when cooldown expires', () => {
      const player = createDefaultPlayerState('p1', 'Player1');
      player.abilities.primaryFire.lastUsed = 100;

      const players = new Map([['p1', player]]);
      const cooldownTicks = cooldownMsToTicks(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS);

      // One tick before cooldown expires
      cooldownSystem.updateAllCooldowns(players, 100 + cooldownTicks - 1);
      expect(player.abilities.primaryFire.ready).toBe(false);

      // Exactly when cooldown expires
      cooldownSystem.updateAllCooldowns(players, 100 + cooldownTicks);
      expect(player.abilities.primaryFire.ready).toBe(true);
    });
  });
});
