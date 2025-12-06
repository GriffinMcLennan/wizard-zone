import { useGameStore } from '../../stores/gameStore';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  container: {
    textAlign: 'center',
    padding: '48px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
    border: '2px solid rgba(255, 215, 0, 0.5)',
    boxShadow: '0 0 60px rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '24px',
    color: '#94a3b8',
    marginBottom: '32px',
  },
  winnerLabel: {
    fontSize: '18px',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  winnerName: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#4ade80',
    textShadow: '0 0 10px rgba(74, 222, 128, 0.5)',
    marginBottom: '32px',
  },
  youWon: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    marginBottom: '32px',
  },
  button: {
    padding: '16px 48px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    pointerEvents: 'auto',
  },
};

export function GameOverScreen() {
  const gameOver = useGameStore((s) => s.gameOver);
  const playerId = useGameStore((s) => s.playerId);
  const disconnect = useGameStore((s) => s.disconnect);

  if (!gameOver) return null;

  const isWinner = gameOver.winnerId === playerId;

  const handlePlayAgain = () => {
    disconnect();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.title}>GAME OVER</div>
        <div style={styles.subtitle}>The battle has concluded</div>

        {isWinner ? (
          <div style={styles.youWon}>YOU ARE THE CHAMPION!</div>
        ) : (
          <>
            <div style={styles.winnerLabel}>Winner</div>
            <div style={styles.winnerName}>{gameOver.winnerName}</div>
          </>
        )}

        <button
          style={styles.button}
          onClick={handlePlayAgain}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Return to Menu
        </button>
      </div>
    </div>
  );
}
