import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import { createDefaultPlayerState, PHYSICS } from '@wizard-zone/shared';

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
});
