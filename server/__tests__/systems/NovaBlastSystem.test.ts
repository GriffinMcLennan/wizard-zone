import { NovaBlastSystem } from '../../src/systems/NovaBlastSystem.js';
import {
  createDefaultPlayerState,
  ABILITIES,
  NETWORK,
} from '@wizard-zone/shared';

describe('NovaBlastSystem', () => {
  let novaBlastSystem: NovaBlastSystem;

  beforeEach(() => {
    novaBlastSystem = new NovaBlastSystem();
  });

  describe('fireNovaBlast', () => {
    it('should hit enemy within radius', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 3, y: 1, z: 0 }; // 3 units away, within 5 unit radius

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).toContain('enemy');
      expect(result!.damage).toBe(ABILITIES.NOVA_BLAST.DAMAGE);
    });

    it('should NOT hit the caster (self)', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const players = new Map([['caster', caster]]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).not.toContain('caster');
      expect(result!.hitPlayerIds).toHaveLength(0);
    });

    it('should NOT hit players outside radius', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 10, y: 1, z: 0 }; // 10 units away, outside 5 unit radius

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).not.toContain('enemy');
      expect(result!.hitPlayerIds).toHaveLength(0);
    });

    it('should NOT hit dead players', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 3, y: 1, z: 0 }; // Within range
      enemy.isAlive = false;

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).not.toContain('enemy');
    });

    it('should deal correct damage amount', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      enemy.position = { x: 2, y: 1, z: 0 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.damage).toBe(40); // NOVA_BLAST.DAMAGE
    });

    it('should hit multiple enemies simultaneously', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy1 = createDefaultPlayerState('enemy1', 'Enemy1');
      enemy1.position = { x: 2, y: 1, z: 0 };

      const enemy2 = createDefaultPlayerState('enemy2', 'Enemy2');
      enemy2.position = { x: -2, y: 1, z: 0 };

      const enemy3 = createDefaultPlayerState('enemy3', 'Enemy3');
      enemy3.position = { x: 0, y: 1, z: 3 };

      const players = new Map([
        ['caster', caster],
        ['enemy1', enemy1],
        ['enemy2', enemy2],
        ['enemy3', enemy3],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).toHaveLength(3);
      expect(result!.hitPlayerIds).toContain('enemy1');
      expect(result!.hitPlayerIds).toContain('enemy2');
      expect(result!.hitPlayerIds).toContain('enemy3');
    });

    it('should return null when on cooldown', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      // First fire should succeed
      const result1 = novaBlastSystem.fireNovaBlast(caster, players, 1);
      expect(result1).not.toBeNull();

      // Second fire immediately after should fail (on cooldown)
      const result2 = novaBlastSystem.fireNovaBlast(caster, players, 2);
      expect(result2).toBeNull();
    });

    it('should fire when cooldown has expired', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      // First fire
      novaBlastSystem.fireNovaBlast(caster, players, 1);

      // Calculate ticks needed for cooldown (8000ms at 60 ticks/sec)
      const cooldownTicks = Math.ceil(
        ABILITIES.NOVA_BLAST.COOLDOWN_MS / (1000 / NETWORK.TICK_RATE)
      );

      // Fire after cooldown expired
      const result = novaBlastSystem.fireNovaBlast(
        caster,
        players,
        1 + cooldownTicks + 1
      );
      expect(result).not.toBeNull();
    });

    it('should record lastUsed when firing', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      expect(caster.abilities.novaBlast.lastUsed).toBe(0);

      novaBlastSystem.fireNovaBlast(caster, players, 100);

      expect(caster.abilities.novaBlast.lastUsed).toBe(100);
    });

    it('should hit player exactly at radius boundary', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      // Exactly at 5 unit radius
      enemy.position = { x: ABILITIES.NOVA_BLAST.RADIUS, y: 1, z: 0 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).toContain('enemy');
    });

    it('should miss player just beyond radius', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      // Just beyond 5 unit radius
      enemy.position = { x: ABILITIES.NOVA_BLAST.RADIUS + 0.1, y: 1, z: 0 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).not.toContain('enemy');
    });

    it('should return empty hits array when no enemies in range', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };

      const players = new Map([['caster', caster]]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).toHaveLength(0);
    });

    it('should include caster position in result', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 5, y: 2, z: 10 };

      const players = new Map([['caster', caster]]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.casterPosition).toEqual({ x: 5, y: 2, z: 10 });
    });

    it('should include caster id in result', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const players = new Map([['caster', caster]]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.casterId).toBe('caster');
    });

    it('should consider 3D distance including Y axis', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 0, z: 0 };

      const enemy = createDefaultPlayerState('enemy', 'Enemy');
      // 3 units in X, 4 units in Y = 5 unit 3D distance (exactly at boundary)
      enemy.position = { x: 3, y: 4, z: 0 };

      const players = new Map([
        ['caster', caster],
        ['enemy', enemy],
      ]);

      const result = novaBlastSystem.fireNovaBlast(caster, players, 1);

      expect(result).not.toBeNull();
      expect(result!.hitPlayerIds).toContain('enemy');
    });
  });
});
