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
    background: 'rgba(0, 0, 0, 0.8)',
    zIndex: 100,
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '40px',
    textShadow: '0 0 20px #6644ff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  input: {
    padding: '12px 24px',
    fontSize: '18px',
    borderRadius: '8px',
    border: '2px solid #6644ff',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    outline: 'none',
    width: '250px',
  },
  button: {
    padding: '12px 48px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    background: '#6644ff',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  status: {
    marginTop: '16px',
    color: '#888',
    fontSize: '14px',
  },
};

export function MainMenu() {
  const [playerName, setPlayerName] = useState('');
  const connectionState = useGameStore((s) => s.connectionState);
  const connect = useGameStore((s) => s.connect);

  const handleJoin = () => {
    if (!playerName.trim()) return;
    const wsUrl = `ws://localhost:${NETWORK.DEFAULT_PORT}`;
    connect(wsUrl, playerName.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div style={styles.overlay}>
      <h1 style={styles.title}>Wizard Zone</h1>
      <div style={styles.form}>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.input}
          disabled={connectionState === 'connecting'}
          autoFocus
        />
        <button
          onClick={handleJoin}
          style={{
            ...styles.button,
            opacity: connectionState === 'connecting' || !playerName.trim() ? 0.5 : 1,
          }}
          disabled={connectionState === 'connecting' || !playerName.trim()}
        >
          {connectionState === 'connecting' ? 'Connecting...' : 'Join Game'}
        </button>
      </div>
      <p style={styles.status}>
        {connectionState === 'connecting'
          ? 'Connecting to server...'
          : 'Enter a name to join the battle'}
      </p>
    </div>
  );
}
