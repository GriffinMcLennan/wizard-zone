import { ProjectileSystem } from '../../src/systems/ProjectileSystem.js';
import { createDefaultPlayerState, ABILITIES } from '@wizard-zone/shared';

describe('ProjectileSystem', () => {
  let projectileSystem: ProjectileSystem;

  beforeEach(() => {
    projectileSystem = new ProjectileSystem();
  });

  describe('createProjectile', () => {
    it('should create a projectile in front of the player', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position = { x: 0, y: 1, z: 0 };
      player.yaw = 0;
      player.pitch = 0;

      const projectile = projectileSystem.createProjectile(player, 100);

      expect(projectile.ownerId).toBe('test-id');
      expect(projectile.position.z).toBeLessThan(0); // Forward is -Z
      expect(projectile.velocity.z).toBeLessThan(0);
      expect(Math.abs(projectile.velocity.z)).toBeCloseTo(ABILITIES.PRIMARY_FIRE.PROJECTILE_SPEED, 1);
    });

    it('should fire in the direction the player is looking (rotated left)', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position = { x: 0, y: 1, z: 0 };
      player.yaw = Math.PI / 2; // Rotated 90 degrees left
      player.pitch = 0;

      const projectile = projectileSystem.createProjectile(player, 100);

      // Should be moving primarily in -X direction (left)
      expect(projectile.velocity.x).toBeLessThan(0);
      expect(Math.abs(projectile.velocity.x)).toBeGreaterThan(
        Math.abs(projectile.velocity.z)
      );
    });

    it('should fire upward when looking up', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position = { x: 0, y: 1, z: 0 };
      player.yaw = 0;
      player.pitch = Math.PI / 4; // Looking 45 degrees up

      const projectile = projectileSystem.createProjectile(player, 100);

      expect(projectile.velocity.y).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should move projectiles according to velocity', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      const projectile = projectileSystem.createProjectile(player, 0);
      const initialZ = projectile.position.z;

      const projectiles = new Map([[projectile.id, projectile]]);
      projectileSystem.update(projectiles, 1, 1 / 60);

      expect(projectile.position.z).not.toBe(initialZ);
    });

    it('should return expired projectile IDs', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      const projectile = projectileSystem.createProjectile(player, 0);
      projectile.lifetime = 10; // Short lifetime

      const projectiles = new Map([[projectile.id, projectile]]);

      // After 15 ticks, should be expired
      const expired = projectileSystem.update(projectiles, 15, 1 / 60);

      expect(expired).toContain(projectile.id);
    });
  });

  describe('canFire', () => {
    it('should allow firing when cooldown is ready', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      expect(projectileSystem.canFire(player, 100)).toBe(true);
    });

    it('should prevent firing during cooldown', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      // Fire once
      projectileSystem.recordFire(player, 100);

      // Should be on cooldown
      expect(projectileSystem.canFire(player, 101)).toBe(false);
    });

    it('should allow firing after cooldown expires', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      projectileSystem.recordFire(player, 100);

      // Cooldown is 500ms = 30 ticks at 60Hz
      const cooldownTicks = Math.ceil(ABILITIES.PRIMARY_FIRE.COOLDOWN_MS / (1000 / 60));

      expect(projectileSystem.canFire(player, 100 + cooldownTicks)).toBe(true);
    });
  });

  // Note: updateCooldowns has been moved to CooldownSystem
  // See CooldownSystem.test.ts for cooldown update tests
});
