import { ArcaneRaySystem } from '../../src/systems/ArcaneRaySystem.js';
import {
  createDefaultPlayerState,
  ABILITIES,
  PHYSICS,
  NETWORK,
} from '@wizard-zone/shared';

describe('ArcaneRaySystem', () => {
  let arcaneRaySystem: ArcaneRaySystem;

  beforeEach(() => {
    arcaneRaySystem = new ArcaneRaySystem();
  });

  describe('fireArcaneRay', () => {
    it('should hit player directly in front', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0; // Looking down -Z axis
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 0, y: 1, z: -5 }; // Directly in front

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBe('enemy');
      expect(result!.damage).toBe(ABILITIES.ARCANE_RAY.DAMAGE);
    });

    it('should hit closest player when multiple in line', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const nearEnemy = createDefaultPlayerState('near', 'Near');
      nearEnemy.position = { x: 0, y: 1, z: -5 };

      const farEnemy = createDefaultPlayerState('far', 'Far');
      farEnemy.position = { x: 0, y: 1, z: -15 };

      const players = new Map([
        ['caster', caster],
        ['near', nearEnemy],
        ['far', farEnemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBe('near');
    });

    it('should NOT hit self', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const players = new Map([['caster', caster]]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBeNull();
    });

    it('should NOT hit dead players', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 0, y: 1, z: -5 };
      enemy.isAlive = false;

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBeNull();
    });

    it('should miss player to the side', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0; // Looking down -Z
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 10, y: 1, z: -5 }; // Off to the side

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBeNull();
    });

    it('should deal correct damage amount', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 0, y: 1, z: -5 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.damage).toBe(35); // ARCANE_RAY.DAMAGE
    });

    it('should hit player at very long distance (infinite range)', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 0, y: 1, z: -150 }; // Very far away

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBe('enemy');
    });

    it('should return null when on cooldown', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      // First fire should succeed
      const result1 = arcaneRaySystem.fireArcaneRay(caster, players, 1);
      expect(result1).not.toBeNull();

      // Second fire immediately after should fail (on cooldown)
      const result2 = arcaneRaySystem.fireArcaneRay(caster, players, 2);
      expect(result2).toBeNull();
    });

    it('should fire when cooldown has expired', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      // First fire
      arcaneRaySystem.fireArcaneRay(caster, players, 1);

      // Calculate ticks needed for cooldown (6000ms at 60 ticks/sec)
      const cooldownTicks = Math.ceil(
        ABILITIES.ARCANE_RAY.COOLDOWN_MS / (1000 / NETWORK.TICK_RATE)
      );

      // Fire after cooldown expired
      const result = arcaneRaySystem.fireArcaneRay(
        caster,
        players,
        1 + cooldownTicks + 1
      );
      expect(result).not.toBeNull();
    });

    it('should record lastUsed when firing', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      expect(caster.abilities.arcaneRay.lastUsed).toBe(0);

      arcaneRaySystem.fireArcaneRay(caster, players, 100);

      expect(caster.abilities.arcaneRay.lastUsed).toBe(100);
    });

    it('should originate from eye level', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 5, y: 2, z: 10 };

      const players = new Map([['caster', caster]]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.origin.x).toBe(5);
      expect(result!.origin.y).toBe(2 + PHYSICS.PLAYER_HEIGHT / 2);
      expect(result!.origin.z).toBe(10);
    });

    it('should return endpoint at max visual range when no hit', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0; // Looking down -Z
      caster.pitch = 0;

      const players = new Map([['caster', caster]]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBeNull();
      // Endpoint should be at ARCANE_RAY.RANGE distance in -Z direction
      const expectedZ = (1 + PHYSICS.PLAYER_HEIGHT / 2) + (-1 * ABILITIES.ARCANE_RAY.RANGE);
      expect(result!.endpoint.z).toBeCloseTo(-ABILITIES.ARCANE_RAY.RANGE, 1);
    });

    it('should hit player at angle with pitch adjustment', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = Math.PI / 6; // Looking up 30 degrees

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      // Position enemy above and in front where 30 degree angle would hit
      const distance = 10;
      enemy.position = {
        x: 0,
        y: 1 + PHYSICS.PLAYER_HEIGHT / 2 + distance * Math.sin(Math.PI / 6),
        z: -distance * Math.cos(Math.PI / 6),
      };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBe('enemy');
    });

    it('should return correct endpoint when hitting player', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 0, y: 1, z: -10 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      // Endpoint should be at or near the enemy position
      expect(result!.endpoint.z).toBeLessThan(0);
      expect(result!.endpoint.z).toBeGreaterThan(-15); // Should stop at enemy, not continue
    });

    it('should work with rotated yaw', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = Math.PI / 2; // Looking down -X axis (rotated 90 degrees)
      caster.pitch = 0;

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: -5, y: 1, z: 0 }; // In -X direction

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = arcaneRaySystem.fireArcaneRay(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerId).toBe('enemy');
    });
  });
});
