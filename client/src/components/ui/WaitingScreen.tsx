import { useGameStore } from '../../stores/gameStore';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  container: {
    textAlign: 'center',
    padding: '48px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
    border: '2px solid rgba(99, 102, 241, 0.5)',
    boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#6366f1',
    textShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
    marginBottom: '16px',
  },
  waiting: {
    fontSize: '24px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  playerCount: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#facc15',
    marginBottom: '32px',
  },
  button: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    pointerEvents: 'auto',
  },
};

export function WaitingScreen() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const currentPlayerCount = useGameStore((s) => s.currentPlayerCount);
  const minPlayers = useGameStore((s) => s.minPlayers);
  const returnToMenu = useGameStore((s) => s.returnToMenu);

  // Only show when waiting for players
  if (gamePhase !== 'waiting_for_players') return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.title}>WIZARD ZONE</div>
        <div style={styles.waiting}>Waiting for players...</div>
        <div style={styles.playerCount}>
          {currentPlayerCount} / {minPlayers} players
        </div>
        <button
          style={styles.button}
          onClick={returnToMenu}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
