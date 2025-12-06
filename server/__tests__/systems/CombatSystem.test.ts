import { CombatSystem } from '../../src/systems/CombatSystem.js';
import { createDefaultPlayerState } from '@wizard-zone/shared';

describe('CombatSystem', () => {
  let combatSystem: CombatSystem;

  beforeEach(() => {
    combatSystem = new CombatSystem();
  });

  describe('applyHit', () => {
    it('should reduce player health by damage amount', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      const initialHealth = player.health;
      const players = new Map([['player1', player]]);

      combatSystem.applyHit(players, 'player1', 'player2', 25);

      expect(player.health).toBe(initialHealth - 25);
      expect(player.isAlive).toBe(true);
    });

    it('should kill player when health reaches zero', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.health = 25;
      const players = new Map([['player1', player]]);

      const death = combatSystem.applyHit(players, 'player1', 'player2', 25);

      expect(player.health).toBe(0);
      expect(player.isAlive).toBe(false);
      expect(death).not.toBeNull();
      expect(death?.victimId).toBe('player1');
      expect(death?.killerId).toBe('player2');
    });

    it('should kill player when health goes below zero', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.health = 10;
      const players = new Map([['player1', player]]);

      const death = combatSystem.applyHit(players, 'player1', 'player2', 25);

      expect(player.health).toBe(0);
      expect(player.isAlive).toBe(false);
      expect(death).not.toBeNull();
    });

    it('should return null when player not found', () => {
      const players = new Map();

      const death = combatSystem.applyHit(
        players,
        'nonexistent',
        'player2',
        25
      );

      expect(death).toBeNull();
    });

    it('should return null when player is already dead', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isAlive = false;
      const players = new Map([['player1', player]]);

      const death = combatSystem.applyHit(players, 'player1', 'player2', 25);

      expect(death).toBeNull();
    });

    it('should not modify dead player health', () => {
      const player = createDefaultPlayerState('player1', 'Player1');
      player.isAlive = false;
      player.health = 50;
      const players = new Map([['player1', player]]);

      combatSystem.applyHit(players, 'player1', 'player2', 25);

      expect(player.health).toBe(50); // Unchanged
    });
  });

  describe('checkWinCondition', () => {
    it('should return winner id when only one player alive', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.isAlive = true;

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.isAlive = false;

      const player3 = createDefaultPlayerState('player3', 'Player3');
      player3.isAlive = false;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
        ['player3', player3],
      ]);

      const winnerId = combatSystem.checkWinCondition(players);

      expect(winnerId).toBe('player1');
    });

    it('should return null when multiple players alive', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.isAlive = true;

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.isAlive = true;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      const winnerId = combatSystem.checkWinCondition(players);

      expect(winnerId).toBeNull();
    });

    it('should return null when no players alive', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.isAlive = false;

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.isAlive = false;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      const winnerId = combatSystem.checkWinCondition(players);

      expect(winnerId).toBeNull();
    });

    it('should return null for empty player map', () => {
      const players = new Map();

      const winnerId = combatSystem.checkWinCondition(players);

      expect(winnerId).toBeNull();
    });
  });

  describe('getAliveCount', () => {
    it('should return count of alive players', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.isAlive = true;

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.isAlive = false;

      const player3 = createDefaultPlayerState('player3', 'Player3');
      player3.isAlive = true;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
        ['player3', player3],
      ]);

      expect(combatSystem.getAliveCount(players)).toBe(2);
    });

    it('should return 0 for empty map', () => {
      const players = new Map();

      expect(combatSystem.getAliveCount(players)).toBe(0);
    });

    it('should return 0 when all players dead', () => {
      const player1 = createDefaultPlayerState('player1', 'Player1');
      player1.isAlive = false;

      const player2 = createDefaultPlayerState('player2', 'Player2');
      player2.isAlive = false;

      const players = new Map([
        ['player1', player1],
        ['player2', player2],
      ]);

      expect(combatSystem.getAliveCount(players)).toBe(0);
    });
  });
});
