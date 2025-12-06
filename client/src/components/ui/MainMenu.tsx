import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { NETWORK } from '@wizard-zone/shared';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(20, 10, 40, 0.95) 0%, rgba(10, 5, 30, 0.98) 100%)',
    zIndex: 100,
  },
  container: {
    textAlign: 'center',
    padding: '48px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(40, 20, 80, 0.6) 0%, rgba(20, 10, 50, 0.6) 100%)',
    border: '1px solid rgba(102, 68, 255, 0.3)',
    boxShadow: '0 0 60px rgba(102, 68, 255, 0.2), inset 0 0 30px rgba(102, 68, 255, 0.1)',
  },
  title: {
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
    textShadow: '0 0 30px #6644ff, 0 0 60px #6644ff',
    letterSpacing: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#a78bfa',
    marginBottom: '40px',
    letterSpacing: '8px',
    textTransform: 'uppercase',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    padding: '16px 24px',
    fontSize: '18px',
    borderRadius: '12px',
    border: '2px solid rgba(102, 68, 255, 0.5)',
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#fff',
    outline: 'none',
    width: '280px',
    transition: 'all 0.3s',
  },
  button: {
    padding: '16px 64px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6644ff 50%, #4c1d95 100%)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 20px rgba(102, 68, 255, 0.4)',
    letterSpacing: '2px',
  },
  status: {
    marginTop: '24px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  controls: {
    marginTop: '40px',
    padding: '20px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  controlsTitle: {
    fontSize: '14px',
    color: '#a78bfa',
    marginBottom: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  controlsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px 24px',
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'left',
  },
  controlItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  controlKey: {
    color: '#fff',
    fontWeight: 'bold',
    background: 'rgba(102, 68, 255, 0.3)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
};

export function MainMenu() {
  const [playerName, setPlayerName] = useState('');
  const connectionState = useGameStore((s) => s.connectionState);
  const connect = useGameStore((s) => s.connect);

  const handleJoin = () => {
    if (!playerName.trim()) return;
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://localhost:${NETWORK.DEFAULT_PORT}`;
    connect(wsUrl, playerName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>WIZARD ZONE</h1>
        <p style={styles.subtitle}>Battle Royale</p>

        <div style={styles.form}>
          <div style={styles.inputContainer}>
            <input
              type="text"
              placeholder="Enter your wizard name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
              disabled={connectionState === 'connecting'}
              autoFocus
            />
          </div>
          <button
            onClick={handleJoin}
            style={{
              ...styles.button,
              opacity: connectionState === 'connecting' || !playerName.trim() ? 0.5 : 1,
              transform: connectionState === 'connecting' || !playerName.trim() ? 'none' : 'scale(1)',
            }}
            disabled={connectionState === 'connecting' || !playerName.trim()}
            onMouseOver={(e) => {
              if (playerName.trim() && connectionState !== 'connecting') {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 30px rgba(102, 68, 255, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 68, 255, 0.4)';
            }}
          >
            {connectionState === 'connecting' ? 'CONNECTING...' : 'ENTER ARENA'}
          </button>
        </div>

        <p style={styles.status}>
          {connectionState === 'connecting'
            ? 'Connecting to server...'
            : 'Last wizard standing wins!'}
        </p>

        <div style={styles.controls}>
          <div style={styles.controlsTitle}>Controls</div>
          <div style={styles.controlsList}>
            <div style={styles.controlItem}>
              <span>Move</span>
              <span style={styles.controlKey}>WASD</span>
            </div>
            <div style={styles.controlItem}>
              <span>Look</span>
              <span style={styles.controlKey}>Mouse</span>
            </div>
            <div style={styles.controlItem}>
              <span>Jump</span>
              <span style={styles.controlKey}>Space</span>
            </div>
            <div style={styles.controlItem}>
              <span>Fire</span>
              <span style={styles.controlKey}>Click</span>
            </div>
            <div style={styles.controlItem}>
              <span>Dash</span>
              <span style={styles.controlKey}>Shift</span>
            </div>
            <div style={styles.controlItem}>
              <span>Launch</span>
              <span style={styles.controlKey}>Q</span>
            </div>
            <div style={styles.controlItem}>
              <span>Nova Blast</span>
              <span style={styles.controlKey}>E</span>
            </div>
            <div style={styles.controlItem}>
              <span>Arcane Ray</span>
              <span style={styles.controlKey}>R</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
