import {
  GamePhase,
  PlayerId,
  ServerMessageType,
  GamePhaseUpdateMessage,
  CountdownUpdateMessage,
  GameOverMessage,
  GAME,
} from '@wizard-zone/shared';

type BroadcastFn = (message: object) => void;

export class GamePhaseManager {
  private phase: GamePhase = 'waiting_for_players';
  private countdownSeconds: number = 0;
  private countdownIntervalId: NodeJS.Timeout | null = null;

  private broadcast: BroadcastFn;
  private onGameStart: () => void;

  constructor(broadcast: BroadcastFn, onGameStart: () => void) {
    this.broadcast = broadcast;
    this.onGameStart = onGameStart;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getCountdownSeconds(): number {
    return this.countdownSeconds;
  }

  canStartNewGame(playerCount: number): boolean {
    return playerCount >= GAME.MIN_PLAYERS_TO_START;
  }

  checkAutoStart(playerCount: number): void {
    if (this.phase !== 'waiting_for_players') return;

    if (playerCount >= GAME.MIN_PLAYERS_TO_START) {
      this.startCountdown(playerCount);
    }
  }

  onPlayerCountChanged(playerCount: number): void {
    if (this.phase === 'countdown') {
      if (playerCount < GAME.MIN_PLAYERS_TO_START) {
        this.stopCountdown();
        this.phase = 'waiting_for_players';
        this.broadcastPhase(playerCount);
        console.log('[GamePhaseManager] Not enough players, returning to waiting state');
      }
    }
  }

  handleGameOver(winnerId: PlayerId, winnerName: string): void {
    const gameOverMessage: GameOverMessage = {
      type: ServerMessageType.GAME_OVER,
      winnerId,
      winnerName,
    };
    this.broadcast(gameOverMessage);

    console.log(`[GamePhaseManager] Game over! Winner: ${winnerName}`);

    // Start countdown for next game - use current player count (we don't have it here, but the count is already >= 1)
    this.startCountdown(GAME.MIN_PLAYERS_TO_START);
  }

  startPlaying(playerCount: number): void {
    this.stopCountdown();
    this.phase = 'playing';
    this.broadcastPhase(playerCount);
    console.log('[GamePhaseManager] Game started');
  }

  private startCountdown(playerCount: number): void {
    this.phase = 'countdown';
    this.countdownSeconds = GAME.COUNTDOWN_SECONDS;

    this.broadcastPhase(playerCount);
    this.broadcastCountdown();

    this.countdownIntervalId = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        this.phase = 'playing';
        this.broadcastPhase(playerCount);
        this.onGameStart();
      } else {
        this.broadcastCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  fullReset(): void {
    this.stopCountdown();
    this.phase = 'waiting_for_players';
    this.countdownSeconds = 0;
    console.log('[GamePhaseManager] Phase manager reset');
  }

  stop(): void {
    this.stopCountdown();
  }

  broadcastPhase(playerCount: number): void {
    const message: GamePhaseUpdateMessage = {
      type: ServerMessageType.GAME_PHASE_UPDATE,
      phase: this.phase,
      minPlayers: GAME.MIN_PLAYERS_TO_START,
      currentPlayers: playerCount,
    };
    this.broadcast(message);
  }

  private broadcastCountdown(): void {
    const message: CountdownUpdateMessage = {
      type: ServerMessageType.COUNTDOWN_UPDATE,
      secondsRemaining: this.countdownSeconds,
    };
    this.broadcast(message);
  }
}
