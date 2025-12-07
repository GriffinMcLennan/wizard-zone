import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { InputProcessor } from '../../src/game/InputProcessor.js';
import {
  createDefaultPlayerState,
  InputState,
  PlayerState,
  ProjectileState,
  ABILITIES,
  ServerMessageType,
  PlayerId,
} from '@wizard-zone/shared';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import { ProjectileSystem } from '../../src/systems/ProjectileSystem.js';
import { NovaBlastSystem } from '../../src/systems/NovaBlastSystem.js';
import { ArcaneRaySystem } from '../../src/systems/ArcaneRaySystem.js';
import { CombatSystem } from '../../src/systems/CombatSystem.js';

function createTestInput(overrides: Partial<InputState> = {}): InputState {
  return {
    sequenceNumber: 1,
    movement: {
      forward: false,
      backward: false,
      left: false,
      right: false,
    },
    actions: {
      jump: false,
      primaryFire: false,
      dash: false,
      launchJump: false,
      novaBlast: false,
      arcaneRay: false,
    },
    look: {
      yaw: 0,
      pitch: 0,
    },
    ...overrides,
  };
}

describe('InputProcessor', () => {
  let inputProcessor: InputProcessor;
  let mockBroadcast: jest.Mock;
  let physicsSystem: PhysicsSystem;
  let projectileSystem: ProjectileSystem;
  let novaBlastSystem: NovaBlastSystem;
  let arcaneRaySystem: ArcaneRaySystem;
  let combatSystem: CombatSystem;

  beforeEach(() => {
    mockBroadcast = jest.fn();
    physicsSystem = new PhysicsSystem();
    projectileSystem = new ProjectileSystem();
    novaBlastSystem = new NovaBlastSystem();
    arcaneRaySystem = new ArcaneRaySystem();
    combatSystem = new CombatSystem();

    inputProcessor = new InputProcessor({
      physicsSystem,
      projectileSystem,
      novaBlastSystem,
      arcaneRaySystem,
      combatSystem,
      broadcast: mockBroadcast,
    });
  });

  describe('applyInput', () => {
    it('should update player look direction', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        look: { yaw: 1.5, pitch: 0.3 },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      expect(player.yaw).toBe(1.5);
      expect(player.pitch).toBe(0.3);
    });

    it('should apply movement input to player', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isGrounded = true;
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        movement: { forward: true, backward: false, left: false, right: false },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      // Velocity should be non-zero after movement input
      expect(Math.abs(player.velocity.x) + Math.abs(player.velocity.z)).toBeGreaterThan(0);
    });

    it('should apply jump when requested and player is grounded', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isGrounded = true;
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, jump: true },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      expect(player.velocity.y).toBeGreaterThan(0);
      expect(player.isGrounded).toBe(false);
    });

    it('should create projectile when primary fire is pressed and ready', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, primaryFire: true },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      expect(projectiles.size).toBe(1);
    });

    it('should not create projectile when on cooldown', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.abilities.primaryFire.lastUsed = 100; // Just used
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, primaryFire: true },
      });

      // Try to fire again at tick 101 (should be on cooldown)
      inputProcessor.applyInput(player, input, projectiles, players, 101, onDeath);

      expect(projectiles.size).toBe(0);
    });

    it('should apply dash when shift pressed and ready', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isGrounded = true;
      const initialVelocityMagnitude = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2
      );
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, dash: true },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      const newVelocityMagnitude = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.z ** 2
      );
      expect(newVelocityMagnitude).toBeGreaterThan(initialVelocityMagnitude);
    });

    it('should apply launch jump when Q pressed and ready', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isGrounded = true;
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['player1', player]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, launchJump: true },
      });

      inputProcessor.applyInput(player, input, projectiles, players, 100, onDeath);

      expect(player.velocity.y).toBe(ABILITIES.LAUNCH_JUMP.VERTICAL_VELOCITY);
    });
  });

  describe('nova blast', () => {
    it('should fire nova blast and apply damage to nearby players', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 0, z: 0 };

      const victim = createDefaultPlayerState('victim', 'Victim');
      victim.position = { x: 3, y: 0, z: 0 }; // Within nova blast radius (5)
      const initialHealth = victim.health;

      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([
        ['caster', caster],
        ['victim', victim],
      ]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, novaBlast: true },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(victim.health).toBe(initialHealth - ABILITIES.NOVA_BLAST.DAMAGE);
    });

    it('should broadcast NovaBlastMessage when nova blast fires', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['caster', caster]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, novaBlast: true },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.NOVA_BLAST,
          casterId: 'caster',
          radius: ABILITIES.NOVA_BLAST.RADIUS,
        })
      );
    });

    it('should call onDeath callback when nova blast kills a player', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 0, z: 0 };

      const victim = createDefaultPlayerState('victim', 'Victim');
      victim.position = { x: 3, y: 0, z: 0 }; // Within nova blast radius
      victim.health = ABILITIES.NOVA_BLAST.DAMAGE; // Exactly enough to kill

      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([
        ['caster', caster],
        ['victim', victim],
      ]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, novaBlast: true },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(onDeath).toHaveBeenCalledWith({
        victimId: 'victim',
        killerId: 'caster',
      });
    });
  });

  describe('arcane ray', () => {
    it('should fire arcane ray and apply damage to hit player', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const victim = createDefaultPlayerState('victim', 'Victim');
      victim.position = { x: 0, y: 1, z: -5 }; // In front of caster
      const initialHealth = victim.health;

      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([
        ['caster', caster],
        ['victim', victim],
      ]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, arcaneRay: true },
        look: { yaw: 0, pitch: 0 },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(victim.health).toBe(initialHealth - ABILITIES.ARCANE_RAY.DAMAGE);
    });

    it('should broadcast ArcaneRayMessage when arcane ray fires', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([['caster', caster]]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, arcaneRay: true },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.ARCANE_RAY,
          casterId: 'caster',
        })
      );
    });

    it('should call onDeath callback when arcane ray kills a player', () => {
      const caster = createDefaultPlayerState('caster', 'Caster');
      caster.position = { x: 0, y: 1, z: 0 };
      caster.yaw = 0;
      caster.pitch = 0;

      const victim = createDefaultPlayerState('victim', 'Victim');
      victim.position = { x: 0, y: 1, z: -5 }; // In front of caster
      victim.health = ABILITIES.ARCANE_RAY.DAMAGE; // Exactly enough to kill

      const projectiles = new Map<string, ProjectileState>();
      const players = new Map<PlayerId, PlayerState>([
        ['caster', caster],
        ['victim', victim],
      ]);
      const onDeath = jest.fn();

      const input = createTestInput({
        actions: { ...createTestInput().actions, arcaneRay: true },
        look: { yaw: 0, pitch: 0 },
      });

      inputProcessor.applyInput(caster, input, projectiles, players, 100, onDeath);

      expect(onDeath).toHaveBeenCalledWith({
        victimId: 'victim',
        killerId: 'caster',
      });
    });
  });
});
