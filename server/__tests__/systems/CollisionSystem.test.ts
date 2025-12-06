import { CollisionSystem } from '../../src/systems/CollisionSystem.js';
import {
  createDefaultPlayerState,
  ProjectileState,
  ProjectileType,
  PHYSICS,
  ABILITIES,
} from '@wizard-zone/shared';

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();
  });

  function createProjectile(
    ownerId: string,
    x: number,
    y: number,
    z: number
  ): ProjectileState {
    return {
      id: `projectile-${Math.random()}`,
      type: ProjectileType.FIREBALL,
      ownerId,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: -10 },
      createdAt: 0,
      lifetime: 100,
      damage: ABILITIES.PRIMARY_FIRE.DAMAGE,
      radius: ABILITIES.PRIMARY_FIRE.RADIUS,
    };
  }

  describe('checkProjectileCollisions', () => {
    it('should detect collision when projectile overlaps player', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const players = new Map([['player1', player]]);

      // Projectile at player center (adjusted for hitbox center)
      const projectile = createProjectile(
        'player2',
        0,
        PHYSICS.PLAYER_HEIGHT / 2,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(1);
      expect(hits[0].playerId).toBe('player1');
      expect(hits[0].ownerId).toBe('player2');
      expect(hits[0].damage).toBe(ABILITIES.PRIMARY_FIRE.DAMAGE);
    });

    it('should not detect collision when projectile is far from player', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const players = new Map([['player1', player]]);

      // Projectile far away
      const projectile = createProjectile('player2', 100, 1, 100);
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(0);
    });

    it('should not detect collision with projectile owner', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const players = new Map([['player1', player]]);

      // Projectile at player center but owned by same player
      const projectile = createProjectile(
        'player1',
        0,
        PHYSICS.PLAYER_HEIGHT / 2,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(0);
    });

    it('should not detect collision with dead players', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };
      player.isAlive = false;

      const players = new Map([['player1', player]]);

      // Projectile at player center
      const projectile = createProjectile(
        'player2',
        0,
        PHYSICS.PLAYER_HEIGHT / 2,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(0);
    });

    it('should only hit one player per projectile', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 }; // Same position

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      // Projectile overlaps both players
      const projectile = createProjectile(
        'player3',
        0,
        PHYSICS.PLAYER_HEIGHT / 2,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(1);
    });

    it('should detect collision at edge of hitbox', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const players = new Map([['player1', player]]);

      // Calculate player center Y (matches CollisionSystem calculation)
      const playerCenterY =
        player.position.y + PHYSICS.PLAYER_HEIGHT / 2 - PHYSICS.PLAYER_RADIUS;

      // Projectile just touching the edge of player hitbox
      const totalRadius = PHYSICS.PLAYER_RADIUS + ABILITIES.PRIMARY_FIRE.RADIUS;
      const projectile = createProjectile(
        'player2',
        totalRadius - 0.01, // Just inside collision range
        playerCenterY,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(1);
    });

    it('should not detect collision just outside hitbox', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.position = { x: 0, y: PHYSICS.PLAYER_HEIGHT / 2, z: 0 };

      const players = new Map([['player1', player]]);

      // Calculate player center Y (matches CollisionSystem calculation)
      const playerCenterY =
        player.position.y + PHYSICS.PLAYER_HEIGHT / 2 - PHYSICS.PLAYER_RADIUS;

      // Projectile just outside the edge of player hitbox
      const totalRadius = PHYSICS.PLAYER_RADIUS + ABILITIES.PRIMARY_FIRE.RADIUS;
      const projectile = createProjectile(
        'player2',
        totalRadius + 0.1, // Just outside collision range
        playerCenterY,
        0
      );
      const projectiles = new Map([[projectile.id, projectile]]);

      const hits = collisionSystem.checkProjectileCollisions(
        players,
        projectiles
      );

      expect(hits).toHaveLength(0);
    });
  });

  describe('resolvePlayerCollisions', () => {
    it('should push overlapping players apart', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.position = { x: 0, y: 1, z: 0 };

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.position = { x: 0.2, y: 1, z: 0 }; // Very close to player1

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      collisionSystem.resolvePlayerCollisions(players);

      // Players should be pushed apart
      const dx = player2.position.x - player1.position.x;
      const dz = player2.position.z - player1.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      expect(distance).toBeGreaterThanOrEqual(PHYSICS.PLAYER_RADIUS * 2 - 0.01);
    });

    it('should not affect non-overlapping players', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.position = { x: 0, y: 1, z: 0 };

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.position = { x: 10, y: 1, z: 0 }; // Far from player1

      const initialX1 = player1.position.x;
      const initialX2 = player2.position.x;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      collisionSystem.resolvePlayerCollisions(players);

      expect(player1.position.x).toBe(initialX1);
      expect(player2.position.x).toBe(initialX2);
    });

    it('should not affect dead players', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.position = { x: 0, y: 1, z: 0 };

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.position = { x: 0.2, y: 1, z: 0 };
      player2.isAlive = false;

      const initialX1 = player1.position.x;
      const initialX2 = player2.position.x;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      collisionSystem.resolvePlayerCollisions(players);

      expect(player1.position.x).toBe(initialX1);
      expect(player2.position.x).toBe(initialX2);
    });
  });
});
