import { useGameStore } from '../../stores/gameStore';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 50,
  },
  topBar: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  stat: {
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 16px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
  },
  healthContainer: {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '300px',
  },
  healthBarBg: {
    width: '100%',
    height: '24px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '4px',
    overflow: 'hidden',
    border: '2px solid rgba(255, 255, 255, 0.3)',
  },
  healthBarFill: {
    height: '100%',
    transition: 'width 0.2s ease-out',
    borderRadius: '2px',
  },
  healthText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  },
  killFeed: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-end',
  },
  killEntry: {
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '6px 12px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    animation: 'fadeIn 0.3s ease-out',
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '20px',
    height: '20px',
  },
  crosshairLine: {
    position: 'absolute',
    background: '#fff',
    opacity: 0.8,
  },
  instructions: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center',
  },
  aliveCount: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '8px 20px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
  },
};

function getHealthBarColor(healthPercent: number): string {
  if (healthPercent > 0.6) return '#4ade80'; // Green
  if (healthPercent > 0.3) return '#facc15'; // Yellow
  return '#ef4444'; // Red
}

export function HUD() {
  const localPlayer = useGameStore((s) => s.localPlayer);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const latency = useGameStore((s) => s.latency);
  const killFeed = useGameStore((s) => s.killFeed);
  const isSpectating = useGameStore((s) => s.isSpectating);

  const health = localPlayer?.health ?? 100;
  const maxHealth = localPlayer?.maxHealth ?? 100;
  const healthPercent = health / maxHealth;

  // Count alive players
  const localAlive = localPlayer?.isAlive ?? true;
  const remoteAlive = Array.from(remotePlayers.values()).filter(p => p.isAlive).length;
  const aliveCount = (localAlive ? 1 : 0) + remoteAlive;

  return (
    <div style={styles.container}>
      {/* Alive count (battle royale style) */}
      <div style={styles.aliveCount}>
        {aliveCount} Alive
      </div>

      {/* Top stats bar */}
      <div style={styles.topBar}>
        {latency > 0 && <div style={styles.stat}>Ping: {latency}ms</div>}
      </div>

      {/* Kill feed (top right) */}
      <div style={styles.killFeed}>
        {killFeed.map((kill, i) => (
          <div key={`${kill.timestamp}-${i}`} style={styles.killEntry}>
            <span style={{ color: '#ef4444' }}>{kill.killerName}</span>
            {' eliminated '}
            <span style={{ color: '#94a3b8' }}>{kill.victimName}</span>
          </div>
        ))}
      </div>

      {/* Crosshair (only show if not spectating) */}
      {!isSpectating && (
        <div style={styles.crosshair}>
          <div
            style={{
              ...styles.crosshairLine,
              width: '2px',
              height: '20px',
              left: '9px',
              top: '0',
            }}
          />
          <div
            style={{
              ...styles.crosshairLine,
              width: '20px',
              height: '2px',
              left: '0',
              top: '9px',
            }}
          />
        </div>
      )}

      {/* Health bar (only show if alive) */}
      {!isSpectating && (
        <div style={styles.healthContainer}>
          <div style={styles.healthBarBg}>
            <div
              style={{
                ...styles.healthBarFill,
                width: `${healthPercent * 100}%`,
                background: getHealthBarColor(healthPercent),
              }}
            />
            <div style={styles.healthText}>
              {health} / {maxHealth}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions}>
        {isSpectating
          ? 'SPECTATING | Left/Right Arrow to switch players'
          : 'Click to lock mouse | WASD to move | Mouse to look | Space to jump | Click to fire'}
      </div>
    </div>
  );
}
