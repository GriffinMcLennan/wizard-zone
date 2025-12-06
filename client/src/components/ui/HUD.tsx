import { ABILITIES } from '@wizard-zone/shared';
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
  abilitiesContainer: {
    position: 'absolute',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '12px',
  },
  abilityBox: {
    width: '60px',
    height: '60px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  abilityReady: {
    border: '2px solid #4ade80',
    boxShadow: '0 0 10px rgba(74, 222, 128, 0.3)',
  },
  abilityOnCooldown: {
    border: '2px solid #64748b',
    opacity: 0.7,
  },
  abilityCooldownOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    transition: 'height 0.1s linear',
  },
  abilityKey: {
    fontSize: '10px',
    color: '#94a3b8',
    marginBottom: '2px',
    zIndex: 1,
  },
  abilityName: {
    fontSize: '11px',
    color: '#fff',
    fontWeight: 'bold',
    zIndex: 1,
  },
  abilityCooldownText: {
    fontSize: '14px',
    color: '#fff',
    fontWeight: 'bold',
    zIndex: 1,
  },
};

function getHealthBarColor(healthPercent: number): string {
  if (healthPercent > 0.6) return '#4ade80'; // Green
  if (healthPercent > 0.3) return '#facc15'; // Yellow
  return '#ef4444'; // Red
}

interface AbilityIndicatorProps {
  name: string;
  keyBind: string;
  ready: boolean;
  cooldownRemaining: number;
  maxCooldown: number;
}

function AbilityIndicator({ name, keyBind, ready, cooldownRemaining, maxCooldown }: AbilityIndicatorProps) {
  const cooldownPercent = ready ? 0 : (cooldownRemaining / maxCooldown) * 100;
  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  return (
    <div
      style={{
        ...styles.abilityBox,
        ...(ready ? styles.abilityReady : styles.abilityOnCooldown),
      }}
    >
      {/* Cooldown overlay that shrinks as cooldown progresses */}
      {!ready && (
        <div
          style={{
            ...styles.abilityCooldownOverlay,
            height: `${cooldownPercent}%`,
          }}
        />
      )}
      <div style={styles.abilityKey}>[{keyBind}]</div>
      {ready ? (
        <div style={styles.abilityName}>{name}</div>
      ) : (
        <div style={styles.abilityCooldownText}>{cooldownSeconds}s</div>
      )}
    </div>
  );
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

      {/* Ability cooldown indicators (only show if alive) */}
      {!isSpectating && localPlayer && (
        <div style={styles.abilitiesContainer}>
          <AbilityIndicator
            name="Dash"
            keyBind="Shift"
            ready={localPlayer.abilities.dash.ready}
            cooldownRemaining={localPlayer.abilities.dash.cooldownRemaining}
            maxCooldown={ABILITIES.DASH.COOLDOWN_MS}
          />
          <AbilityIndicator
            name="Launch"
            keyBind="Q"
            ready={localPlayer.abilities.launchJump.ready}
            cooldownRemaining={localPlayer.abilities.launchJump.cooldownRemaining}
            maxCooldown={ABILITIES.LAUNCH_JUMP.COOLDOWN_MS}
          />
          <AbilityIndicator
            name="Nova"
            keyBind="E"
            ready={localPlayer.abilities.novaBlast.ready}
            cooldownRemaining={localPlayer.abilities.novaBlast.cooldownRemaining}
            maxCooldown={ABILITIES.NOVA_BLAST.COOLDOWN_MS}
          />
          <AbilityIndicator
            name="Ray"
            keyBind="R"
            ready={localPlayer.abilities.arcaneRay.ready}
            cooldownRemaining={localPlayer.abilities.arcaneRay.cooldownRemaining}
            maxCooldown={ABILITIES.ARCANE_RAY.COOLDOWN_MS}
          />
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions}>
        {isSpectating
          ? 'SPECTATING | Left/Right Arrow to switch players'
          : 'WASD move | Mouse look | Space jump | Shift dash | Q launch | Click fire | E nova | R ray'}
      </div>
    </div>
  );
}
