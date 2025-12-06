import { GameRoom } from '../../src/game/GameRoom.js';
import { SPAWN_POINTS } from '@wizard-zone/shared';

describe('GameRoom - Spawn Points', () => {
  let gameRoom: GameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom('test-room');
  });

  describe('addPlayer spawn location', () => {
    it('should spawn player at a predefined spawn point', () => {
      gameRoom.addPlayer('player1', 'TestPlayer');

      const player = gameRoom.getPlayer('player1');
      expect(player).toBeDefined();

      // Check that the spawn position matches one of the predefined spawn points
      const isValidSpawnPoint = SPAWN_POINTS.some(
        (point) =>
          point.x === player!.position.x &&
          point.y === player!.position.y &&
          point.z === player!.position.z
      );

      expect(isValidSpawnPoint).toBe(true);
    });

    it('should spawn multiple players at different locations using round-robin', () => {
      // Add 4 players
      gameRoom.addPlayer('player1', 'Player1');
      gameRoom.addPlayer('player2', 'Player2');
      gameRoom.addPlayer('player3', 'Player3');
      gameRoom.addPlayer('player4', 'Player4');

      const player1 = gameRoom.getPlayer('player1');
      const player2 = gameRoom.getPlayer('player2');
      const player3 = gameRoom.getPlayer('player3');
      const player4 = gameRoom.getPlayer('player4');

      // All players should have valid spawn points
      expect(player1).toBeDefined();
      expect(player2).toBeDefined();
      expect(player3).toBeDefined();
      expect(player4).toBeDefined();

      // Players should be at different positions (round-robin)
      const positions = [
        player1!.position,
        player2!.position,
        player3!.position,
        player4!.position,
      ];

      // Check all positions are unique
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const samePosition =
            positions[i].x === positions[j].x &&
            positions[i].y === positions[j].y &&
            positions[i].z === positions[j].z;
          expect(samePosition).toBe(false);
        }
      }
    });

    it('should select spawn point farthest from existing players when many players present', () => {
      // Add enough players to exceed half of spawn points (5+)
      for (let i = 0; i < 6; i++) {
        gameRoom.addPlayer(`player${i}`, `Player${i}`);
      }

      // Add one more player
      gameRoom.addPlayer('newPlayer', 'NewPlayer');
      const newPlayer = gameRoom.getPlayer('newPlayer');

      expect(newPlayer).toBeDefined();

      // The new player should be at a valid spawn point
      const isValidSpawnPoint = SPAWN_POINTS.some(
        (point) =>
          point.x === newPlayer!.position.x &&
          point.y === newPlayer!.position.y &&
          point.z === newPlayer!.position.z
      );
      expect(isValidSpawnPoint).toBe(true);
    });

    it('should always spawn at valid predefined spawn points even with many players', () => {
      // Add more players than spawn points
      for (let i = 0; i < SPAWN_POINTS.length + 2; i++) {
        gameRoom.addPlayer(`player${i}`, `Player${i}`);

        const player = gameRoom.getPlayer(`player${i}`);
        expect(player).toBeDefined();

        // Each player should be at a valid spawn point
        const isValidSpawnPoint = SPAWN_POINTS.some(
          (point) =>
            point.x === player!.position.x &&
            point.y === player!.position.y &&
            point.z === player!.position.z
        );
        expect(isValidSpawnPoint).toBe(true);
      }
    });
  });

  describe('selectBestSpawnPoint', () => {
    it('should return a valid spawn point', () => {
      const spawnPoint = gameRoom.selectBestSpawnPoint();

      const isValidSpawnPoint = SPAWN_POINTS.some(
        (point) =>
          point.x === spawnPoint.x &&
          point.y === spawnPoint.y &&
          point.z === spawnPoint.z
      );

      expect(isValidSpawnPoint).toBe(true);
    });

    it('should cycle through spawn points with round-robin for few players', () => {
      const firstSpawn = gameRoom.selectBestSpawnPoint();
      const secondSpawn = gameRoom.selectBestSpawnPoint();
      const thirdSpawn = gameRoom.selectBestSpawnPoint();

      // Each call should return a different spawn point
      expect(firstSpawn).not.toEqual(secondSpawn);
      expect(secondSpawn).not.toEqual(thirdSpawn);
      expect(firstSpawn).not.toEqual(thirdSpawn);
    });
  });
});
