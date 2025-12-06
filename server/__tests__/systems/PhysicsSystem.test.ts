import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import { createDefaultPlayerState, PHYSICS, ABILITIES } from '@wizard-zone/shared';

describe('PhysicsSystem', () => {
  let physics: PhysicsSystem;

  beforeEach(() => {
    physics = new PhysicsSystem();
  });

  describe('gravity', () => {
    it('should apply gravity to airborne players', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position.y = 5;
      player.isGrounded = false;
      player.velocity.y = 0;

      const players = new Map([['test-id', player]]);
      physics.update(players, 1 / 60);

      // Gravity should have been applied
      expect(player.velocity.y).toBeLessThan(0);
      expect(player.velocity.y).toBeCloseTo(PHYSICS.GRAVITY / 60, 1);
    });

    it('should stop players at ground level', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position.y = 0.5;
      player.velocity.y = -10;
      player.isGrounded = false;

      const players = new Map([['test-id', player]]);
      physics.update(players, 0.1);

      expect(player.isGrounded).toBe(true);
      expect(player.velocity.y).toBe(0);
      expect(player.position.y).toBeGreaterThanOrEqual(PHYSICS.PLAYER_HEIGHT / 2);
    });
  });

  describe('movement', () => {
    it('should apply forward movement in look direction', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.position.y = PHYSICS.PLAYER_HEIGHT / 2;
      player.isGrounded = true;

      // Move forward with yaw=0 (looking down -Z in Three.js)
      physics.applyMovementInput(player, true, false, false, false, 0);

      // Forward at yaw=0 should be -Z direction
      expect(player.velocity.z).toBeLessThan(0);
      expect(Math.abs(player.velocity.x)).toBeLessThan(0.001);
    });

    it('should apply movement in rotated direction', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      // Rotate 90 degrees left (positive yaw), then move forward
      // This should now move in -X direction
      physics.applyMovementInput(player, true, false, false, false, Math.PI / 2);

      expect(Math.abs(player.velocity.x)).toBeGreaterThan(0);
      expect(Math.abs(player.velocity.z)).toBeLessThan(0.001);
    });

    it('should reduce air control when airborne', () => {
      const groundedPlayer = createDefaultPlayerState('test-id', 'TestPlayer');
      groundedPlayer.isGrounded = true;

      const airbornePlayer = createDefaultPlayerState('test-id-2', 'TestPlayer2');
      airbornePlayer.isGrounded = false;

      physics.applyMovementInput(groundedPlayer, true, false, false, false, 0);
      physics.applyMovementInput(airbornePlayer, true, false, false, false, 0);

      // Airborne player should have reduced velocity
      expect(Math.abs(airbornePlayer.velocity.z)).toBeLessThan(
        Math.abs(groundedPlayer.velocity.z)
      );
    });
  });

  describe('jump', () => {
    it('should allow jumping when grounded', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      const jumped = physics.applyJump(player);

      expect(jumped).toBe(true);
      expect(player.velocity.y).toBe(PHYSICS.JUMP_VELOCITY);
      expect(player.isGrounded).toBe(false);
    });

    it('should not allow jumping when airborne', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = false;
      player.velocity.y = 5;

      const jumped = physics.applyJump(player);

      expect(jumped).toBe(false);
      expect(player.velocity.y).toBe(5); // Unchanged
    });
  });

  describe('dash', () => {
    it('should apply dash velocity in movement direction', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;
      player.velocity.x = 5;
      player.velocity.z = 0;

      const dashed = physics.applyDash(player, 0, 100);

      expect(dashed).toBe(true);
      // Should have significant velocity in X direction (movement dir)
      expect(Math.abs(player.velocity.x)).toBeGreaterThan(PHYSICS.PLAYER_SPEED);
    });

    it('should dash in facing direction when stationary', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.velocity.x = 0;
      player.velocity.z = 0;

      // Facing forward (yaw=0, looking down -Z)
      const dashed = physics.applyDash(player, 0, 100);

      expect(dashed).toBe(true);
      expect(player.velocity.z).toBeLessThan(0); // Moving forward (-Z)
    });

    it('should respect cooldown', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      // First dash should work
      const firstDash = physics.applyDash(player, 0, 100);
      expect(firstDash).toBe(true);

      // Immediate second dash should fail
      const secondDash = physics.applyDash(player, 0, 101);
      expect(secondDash).toBe(false);
    });

    it('should allow dash after cooldown expires', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      physics.applyDash(player, 0, 100);

      // After cooldown expires
      const cooldownTicks = Math.ceil(ABILITIES.DASH.COOLDOWN_MS / (1000 / 60));
      const dashed = physics.applyDash(player, 0, 100 + cooldownTicks);

      expect(dashed).toBe(true);
    });

    it('should set cooldown state correctly', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');

      physics.applyDash(player, 0, 100);

      expect(player.abilities.dash.ready).toBe(false);
      expect(player.abilities.dash.lastUsed).toBe(100);
      expect(player.abilities.dash.cooldownRemaining).toBe(ABILITIES.DASH.COOLDOWN_MS);
    });
  });

  describe('launchJump', () => {
    it('should apply high vertical velocity', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      const launched = physics.applyLaunchJump(player, 0, 100);

      expect(launched).toBe(true);
      expect(player.velocity.y).toBe(ABILITIES.LAUNCH_JUMP.VERTICAL_VELOCITY);
      expect(player.isGrounded).toBe(false);
    });

    it('should apply horizontal boost in facing direction', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;
      player.velocity.x = 0;
      player.velocity.z = 0;

      // Facing forward (yaw=0)
      physics.applyLaunchJump(player, 0, 100);

      // Should have forward boost (-Z direction)
      expect(player.velocity.z).toBeLessThan(0);
    });

    it('should require player to be grounded', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = false;

      const launched = physics.applyLaunchJump(player, 0, 100);

      expect(launched).toBe(false);
    });

    it('should respect cooldown', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      // First launch should work
      const firstLaunch = physics.applyLaunchJump(player, 0, 100);
      expect(firstLaunch).toBe(true);

      // Reset grounded for test
      player.isGrounded = true;

      // Immediate second launch should fail
      const secondLaunch = physics.applyLaunchJump(player, 0, 101);
      expect(secondLaunch).toBe(false);
    });

    it('should allow launch after cooldown expires', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      physics.applyLaunchJump(player, 0, 100);

      // Reset grounded and wait for cooldown
      player.isGrounded = true;
      const cooldownTicks = Math.ceil(ABILITIES.LAUNCH_JUMP.COOLDOWN_MS / (1000 / 60));
      const launched = physics.applyLaunchJump(player, 0, 100 + cooldownTicks);

      expect(launched).toBe(true);
    });

    it('should set cooldown state correctly', () => {
      const player = createDefaultPlayerState('test-id', 'TestPlayer');
      player.isGrounded = true;

      physics.applyLaunchJump(player, 0, 100);

      expect(player.abilities.launchJump.ready).toBe(false);
      expect(player.abilities.launchJump.lastUsed).toBe(100);
      expect(player.abilities.launchJump.cooldownRemaining).toBe(ABILITIES.LAUNCH_JUMP.COOLDOWN_MS);
    });
  });

  // Note: updateAbilityCooldowns has been moved to CooldownSystem
  // See CooldownSystem.test.ts for cooldown update tests
});
