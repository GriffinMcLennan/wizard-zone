import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GamePhaseManager } from '../../src/game/GamePhaseManager.js';
import {
  ServerMessageType,
  GAME,
} from '@wizard-zone/shared';

describe('GamePhaseManager', () => {
  let phaseManager: GamePhaseManager;
  let mockBroadcast: jest.Mock;
  let mockOnGameStart: jest.Mock;

  beforeEach(() => {
    mockBroadcast = jest.fn();
    mockOnGameStart = jest.fn();
    phaseManager = new GamePhaseManager(mockBroadcast, mockOnGameStart);
    jest.useFakeTimers();
  });

  afterEach(() => {
    phaseManager.stop();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should start in waiting_for_players phase', () => {
      expect(phaseManager.getPhase()).toBe('waiting_for_players');
    });

    it('should have countdown at 0', () => {
      expect(phaseManager.getCountdownSeconds()).toBe(0);
    });
  });

  describe('checkAutoStart', () => {
    it('should transition from waiting to countdown when min players reached', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);

      expect(phaseManager.getPhase()).toBe('countdown');
    });

    it('should not transition if below min players', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START - 1);

      expect(phaseManager.getPhase()).toBe('waiting_for_players');
    });

    it('should not transition if already in countdown', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      expect(phaseManager.getPhase()).toBe('countdown');

      // Call again - should not restart countdown
      const initialSeconds = phaseManager.getCountdownSeconds();
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START + 1);
      expect(phaseManager.getCountdownSeconds()).toBe(initialSeconds);
    });

    it('should broadcast phase update when transitioning to countdown', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.GAME_PHASE_UPDATE,
          phase: 'countdown',
        })
      );
    });
  });

  describe('countdown', () => {
    beforeEach(() => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
    });

    it('should set countdown to COUNTDOWN_SECONDS', () => {
      expect(phaseManager.getCountdownSeconds()).toBe(GAME.COUNTDOWN_SECONDS);
    });

    it('should broadcast countdown update every second', () => {
      mockBroadcast.mockClear();

      jest.advanceTimersByTime(1000);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.COUNTDOWN_UPDATE,
          secondsRemaining: GAME.COUNTDOWN_SECONDS - 1,
        })
      );
    });

    it('should decrement countdown each second', () => {
      jest.advanceTimersByTime(1000);
      expect(phaseManager.getCountdownSeconds()).toBe(GAME.COUNTDOWN_SECONDS - 1);

      jest.advanceTimersByTime(1000);
      expect(phaseManager.getCountdownSeconds()).toBe(GAME.COUNTDOWN_SECONDS - 2);
    });

    it('should transition to playing when countdown reaches 0', () => {
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      expect(phaseManager.getPhase()).toBe('playing');
    });

    it('should call onGameStart callback when transitioning to playing', () => {
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      expect(mockOnGameStart).toHaveBeenCalled();
    });

    it('should broadcast phase update when transitioning to playing', () => {
      mockBroadcast.mockClear();

      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.GAME_PHASE_UPDATE,
          phase: 'playing',
        })
      );
    });
  });

  describe('onPlayerCountChanged', () => {
    it('should return to waiting if player count drops below min during countdown', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      expect(phaseManager.getPhase()).toBe('countdown');

      phaseManager.onPlayerCountChanged(GAME.MIN_PLAYERS_TO_START - 1);

      expect(phaseManager.getPhase()).toBe('waiting_for_players');
    });

    it('should broadcast phase update when returning to waiting', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      mockBroadcast.mockClear();

      phaseManager.onPlayerCountChanged(GAME.MIN_PLAYERS_TO_START - 1);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.GAME_PHASE_UPDATE,
          phase: 'waiting_for_players',
        })
      );
    });

    it('should stop countdown timer when returning to waiting', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      phaseManager.onPlayerCountChanged(GAME.MIN_PLAYERS_TO_START - 1);

      // Advance time - should not trigger any countdown updates
      mockBroadcast.mockClear();
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      // Should only get the phase update, not countdown updates
      const countdownUpdates = mockBroadcast.mock.calls.filter(
        (call) => call[0].type === ServerMessageType.COUNTDOWN_UPDATE
      );
      expect(countdownUpdates).toHaveLength(0);
    });

    it('should not change phase if still above min players during countdown', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START + 2);
      phaseManager.onPlayerCountChanged(GAME.MIN_PLAYERS_TO_START);

      expect(phaseManager.getPhase()).toBe('countdown');
    });

    it('should not affect playing phase', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);
      expect(phaseManager.getPhase()).toBe('playing');

      phaseManager.onPlayerCountChanged(GAME.MIN_PLAYERS_TO_START - 1);

      expect(phaseManager.getPhase()).toBe('playing');
    });
  });

  describe('handleGameOver', () => {
    beforeEach(() => {
      // Get to playing phase
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);
      expect(phaseManager.getPhase()).toBe('playing');
      mockBroadcast.mockClear();
    });

    it('should broadcast game over message', () => {
      phaseManager.handleGameOver('winner-id', 'WinnerName');

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.GAME_OVER,
          winnerId: 'winner-id',
          winnerName: 'WinnerName',
        })
      );
    });

    it('should transition to countdown phase', () => {
      phaseManager.handleGameOver('winner-id', 'WinnerName');

      expect(phaseManager.getPhase()).toBe('countdown');
    });

    it('should start countdown for next game', () => {
      phaseManager.handleGameOver('winner-id', 'WinnerName');

      expect(phaseManager.getCountdownSeconds()).toBe(GAME.COUNTDOWN_SECONDS);
    });
  });

  describe('fullReset', () => {
    it('should reset to waiting_for_players phase', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      expect(phaseManager.getPhase()).toBe('countdown');

      phaseManager.fullReset();

      expect(phaseManager.getPhase()).toBe('waiting_for_players');
    });

    it('should stop countdown timer', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      phaseManager.fullReset();

      // Advance time - should not trigger any countdown updates or transitions
      mockBroadcast.mockClear();
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      const countdownUpdates = mockBroadcast.mock.calls.filter(
        (call) => call[0].type === ServerMessageType.COUNTDOWN_UPDATE
      );
      expect(countdownUpdates).toHaveLength(0);
    });

    it('should reset countdown seconds to 0', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      expect(phaseManager.getCountdownSeconds()).toBe(GAME.COUNTDOWN_SECONDS);

      phaseManager.fullReset();

      expect(phaseManager.getCountdownSeconds()).toBe(0);
    });
  });

  describe('broadcastPhase', () => {
    it('should broadcast current phase with player counts', () => {
      phaseManager.broadcastPhase(3);

      expect(mockBroadcast).toHaveBeenCalledWith({
        type: ServerMessageType.GAME_PHASE_UPDATE,
        phase: 'waiting_for_players',
        minPlayers: GAME.MIN_PLAYERS_TO_START,
        currentPlayers: 3,
      });
    });
  });

  describe('canStartNewGame', () => {
    it('should return true if player count >= min players', () => {
      expect(phaseManager.canStartNewGame(GAME.MIN_PLAYERS_TO_START)).toBe(true);
      expect(phaseManager.canStartNewGame(GAME.MIN_PLAYERS_TO_START + 1)).toBe(true);
    });

    it('should return false if player count < min players', () => {
      expect(phaseManager.canStartNewGame(GAME.MIN_PLAYERS_TO_START - 1)).toBe(false);
      expect(phaseManager.canStartNewGame(0)).toBe(false);
    });
  });

  describe('startPlaying', () => {
    it('should transition directly to playing phase', () => {
      phaseManager.startPlaying(3);

      expect(phaseManager.getPhase()).toBe('playing');
    });

    it('should broadcast phase update', () => {
      phaseManager.startPlaying(3);

      expect(mockBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ServerMessageType.GAME_PHASE_UPDATE,
          phase: 'playing',
        })
      );
    });

    it('should stop any running countdown', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      mockBroadcast.mockClear();

      phaseManager.startPlaying(3);

      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      // No countdown updates should have been broadcast
      const countdownUpdates = mockBroadcast.mock.calls.filter(
        (call) => call[0].type === ServerMessageType.COUNTDOWN_UPDATE
      );
      expect(countdownUpdates).toHaveLength(0);
    });
  });

  describe('stop', () => {
    it('should stop countdown timer', () => {
      phaseManager.checkAutoStart(GAME.MIN_PLAYERS_TO_START);
      phaseManager.stop();

      mockBroadcast.mockClear();
      jest.advanceTimersByTime(GAME.COUNTDOWN_SECONDS * 1000);

      const countdownUpdates = mockBroadcast.mock.calls.filter(
        (call) => call[0].type === ServerMessageType.COUNTDOWN_UPDATE
      );
      expect(countdownUpdates).toHaveLength(0);
    });
  });
});
