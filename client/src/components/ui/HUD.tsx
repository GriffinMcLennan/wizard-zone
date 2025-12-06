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
};

export function HUD() {
  const localPlayer = useGameStore((s) => s.localPlayer);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const serverTick = useGameStore((s) => s.serverTick);
  const latency = useGameStore((s) => s.latency);

  const playerCount = 1 + remotePlayers.size;

  return (
    <div style={styles.container}>
      {/* Top stats bar */}
      <div style={styles.topBar}>
        <div style={styles.stat}>
          HP: {localPlayer?.health ?? 100} / {localPlayer?.maxHealth ?? 100}
        </div>
        <div style={styles.stat}>Players: {playerCount}</div>
        <div style={styles.stat}>Tick: {serverTick}</div>
        {latency > 0 && <div style={styles.stat}>Ping: {latency}ms</div>}
      </div>

      {/* Crosshair */}
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

      {/* Instructions */}
      <div style={styles.instructions}>
        Click to lock mouse | WASD to move | Mouse to look | Space to jump
      </div>
    </div>
  );
}
