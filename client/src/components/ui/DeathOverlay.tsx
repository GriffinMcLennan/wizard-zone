import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(139, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#ef4444',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#fff',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginBottom: '32px',
  },
  spectateInfo: {
    position: 'absolute',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.7)',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    textAlign: 'center',
  },
  spectateTarget: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#facc15',
    marginTop: '4px',
  },
};

export function DeathOverlay() {
  const isSpectating = useGameStore((s) => s.isSpectating);
  const spectateTargetId = useGameStore((s) => s.spectateTargetId);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const cycleSpectateTarget = useGameStore((s) => s.cycleSpectateTarget);
  const gameOver = useGameStore((s) => s.gameOver);

  const spectateTarget = spectateTargetId ? remotePlayers.get(spectateTargetId) : null;

  // Handle arrow key input for cycling spectate target
  useEffect(() => {
    if (!isSpectating || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        cycleSpectateTarget(-1);
      } else if (e.key === 'ArrowRight') {
        cycleSpectateTarget(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpectating, gameOver, cycleSpectateTarget]);

  if (!isSpectating || gameOver) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.title}>ELIMINATED</div>
      <div style={styles.subtitle}>You have been eliminated from the match</div>

      {spectateTarget && (
        <div style={styles.spectateInfo}>
          <div>Now Spectating</div>
          <div style={styles.spectateTarget}>{spectateTarget.name}</div>
        </div>
      )}
    </div>
  );
}
