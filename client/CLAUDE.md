# Client Documentation

## Overview

The client is a React + Three.js application that renders the game and sends player inputs to the server. It receives authoritative state from the server at 60Hz and renders interpolated/predicted positions.

## Architecture

```
client/src/
├── main.tsx              # React entry point
├── App.tsx               # Root component with Canvas + UI overlays
├── components/
│   ├── ui/               # HTML/CSS overlay components
│   │   ├── HUD.tsx           # Health, abilities, kill feed, crosshair
│   │   ├── MainMenu.tsx      # Join game screen
│   │   ├── DeathOverlay.tsx  # Spectator mode controls
│   │   ├── WaitingScreen.tsx # Waiting for players screen
│   │   └── GameOverScreen.tsx # Winner announcement
│   └── three/            # React Three Fiber 3D components
│       ├── Scene.tsx         # Main scene, cameras, lighting
│       ├── Arena.tsx         # Ground, platforms, walls (visual)
│       ├── Projectiles.tsx   # Fireball rendering
│       ├── InputController.tsx # Input loop at 60Hz
│       ├── NovaBlastEffect.tsx # AOE visual effect
│       └── ArcaneRayEffect.tsx # Hitscan visual effect
├── hooks/
│   ├── useInput.ts           # Keyboard/mouse state
│   └── useFirstPersonControls.ts # Pointer lock + camera rotation
└── stores/
    └── gameStore.ts          # Zustand global state
```

## State Management (gameStore.ts)

Single Zustand store for all client state:

```typescript
interface GameStore {
  // Connection
  connectionState: 'disconnected' | 'connecting' | 'connected';
  playerId: PlayerId | null;
  socket: WebSocket | null;
  latency: number;

  // Game state (from server)
  serverTick: number;
  localPlayer: PlayerState | null;
  remotePlayers: Map<PlayerId, PlayerState>;
  projectiles: ProjectileState[];

  // Game phase
  gamePhase: GamePhase;  // 'waiting_for_players' | 'countdown' | 'playing'
  countdownSeconds: number;
  currentPlayerCount: number;
  minPlayers: number;

  // Death/spectator
  isSpectating: boolean;
  spectateTargetId: PlayerId | null;
  killFeed: DeathInfo[];
  gameOver: GameOverInfo | null;

  // Visual effects (triggered by server messages)
  novaBlasts: NovaBlastEffect[];
  arcaneRays: ArcaneRayEffect[];

  // Local look direction (client-side, synced to server via input)
  lookYaw: number;
  lookPitch: number;

  // Input history (for future client-side prediction)
  inputHistory: InputState[];
}
```

### Server Message Handling

Messages are processed in `handleServerMessage()`:

- `WELCOME`: Set playerId, connectionState
- `GAME_STATE`: Update localPlayer, remotePlayers, projectiles
- `PLAYER_DIED`: Add to kill feed, enter spectator mode if local player
- `GAME_OVER`: Show winner screen
- `GAME_PHASE_UPDATE`: Update phase, reset spectator state on new game
- `COUNTDOWN_UPDATE`: Update countdown timer
- `NOVA_BLAST`: Add visual effect to array
- `ARCANE_RAY`: Add visual effect to array

## Input System

### useInput.ts

Tracks keyboard and mouse state:

```typescript
const keysRef = useRef<KeyState>({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  dash: false,
  launchJump: false,
  primaryFire: false,
  novaBlast: false,
  arcaneRay: false,
});

// Key bindings
const keyMap = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyQ: 'launchJump',
  KeyE: 'novaBlast',
  KeyR: 'arcaneRay',
};

// Mouse: LMB = primaryFire
```

Returns:
- `getCurrentInput()`: Build InputState from current keys + store look direction
- `sendCurrentInput()`: Get input, add to history, send to server

### useFirstPersonControls.ts

Handles pointer lock and camera rotation:

```typescript
// Mouse movement -> yaw/pitch
const handleMouseMove = (event: MouseEvent) => {
  stateRef.current.yaw -= event.movementX * sensitivity;
  stateRef.current.pitch -= event.movementY * sensitivity;
  stateRef.current.pitch = clamp(pitch, -MAX_PITCH, MAX_PITCH);
};

// Every frame: update camera quaternion, sync to store
useFrame(() => {
  euler.set(pitch, yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  setLook(yaw, pitch);  // Store lookup for input system
});
```

### InputController.tsx

Sends input to server at 60Hz:

```typescript
function InputController() {
  const { sendCurrentInput } = useInput();

  useEffect(() => {
    const interval = setInterval(() => {
      sendCurrentInput();
    }, 1000 / NETWORK.CLIENT_SEND_RATE);  // 60Hz

    return () => clearInterval(interval);
  }, []);

  return null;
}
```

## 3D Scene (Scene.tsx)

Main scene component renders:

```tsx
<>
  {/* Camera controller */}
  {isSpectating ? <SpectatorCamera /> : <FirstPersonCamera />}
  {!isSpectating && <InputController />}

  {/* Lighting */}
  <ambientLight />
  <directionalLight castShadow />
  <hemisphereLight />

  {/* World */}
  <Arena />

  {/* Players */}
  {remotePlayers.map((player) => (
    <RemotePlayerMesh key={player.id} player={player} />
  ))}

  {/* Projectiles */}
  <Projectiles />

  {/* Visual Effects */}
  {novaBlasts.map((effect) => (
    <NovaBlastEffect key={effect.id} {...effect} onComplete={...} />
  ))}
  {arcaneRays.map((effect) => (
    <ArcaneRayEffect key={effect.id} {...effect} onComplete={...} />
  ))}

  {/* Environment */}
  <Sky />
  <fog />
</>
```

### FirstPersonCamera

Updates camera position to match local player:

```typescript
useFrame(() => {
  camera.position.set(
    localPlayer.position.x,
    localPlayer.position.y + PLAYER_HEIGHT / 2,  // Eye level
    localPlayer.position.z
  );
});
```

### SpectatorCamera

Orbits around spectate target:

```typescript
useFrame((_, delta) => {
  angleRef.current += delta * 0.3;  // Slow orbit

  camera.position.set(
    target.position.x + Math.sin(angle) * distance,
    target.position.y + height,
    target.position.z + Math.cos(angle) * distance
  );
  camera.lookAt(target.position);
});
```

### RemotePlayerMesh

Wizard model with:
- Purple robe body (cylinder)
- Head (sphere)
- Wizard hat (cylinder + cone)
- Floating magic orb with animation
- Health bar (Billboard - always faces camera)
- Subtle glow lighting

## Visual Effects

### NovaBlastEffect.tsx

Expanding sphere effect:
- Duration: 0.5 seconds
- Expanding radius with easeOutQuart easing
- Multiple layers: inner core, orange ring, shockwave sphere, flame ring
- Point lights for illumination
- Calls `onComplete` when done (removes from store)

### ArcaneRayEffect.tsx

Beam effect:
- Duration: 0.25 seconds (quick flash)
- Cylindrical beam geometry oriented between origin and endpoint
- Multiple glow layers with additive blending
- Origin and endpoint spheres
- Impact ring at endpoint
- Point lights along beam

## UI Components

### HUD.tsx

Shows during `playing` phase:
- Alive count (top center)
- Ping display (top left)
- Kill feed (top right)
- Crosshair (center, hidden when spectating)
- Health bar (bottom center)
- Ability cooldown indicators (above health bar)

### WaitingScreen.tsx

Shows during `waiting_for_players` phase:
- "Waiting for players..." message
- Current/required player count
- Leave game button

### GameOverScreen.tsx

Shows when `gameOver` is set:
- Winner announcement
- Return to menu button
- Next game countdown

### DeathOverlay.tsx

Shows when `isSpectating` is true:
- "You have been eliminated" message
- Current spectate target name
- Arrow key hints for cycling targets

### MainMenu.tsx

Shows when `connectionState === 'disconnected'`:
- Player name input
- Join game button
- Connects to WebSocket server

## Adding New Visual Elements

### New 3D Component

1. Create component in `components/three/`:
```tsx
export function MyComponent({ position, ...props }) {
  return (
    <mesh position={[position.x, position.y, position.z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="purple" />
    </mesh>
  );
}
```

2. Import and render in `Scene.tsx`

### New Visual Effect

1. Create effect component with animation:
```tsx
export function MyEffect({ onComplete, ...props }) {
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  useFrame((_, delta) => {
    setProgress((p) => Math.min(p + delta / duration, 1));
  });

  useEffect(() => {
    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [progress, onComplete]);

  // Render animated geometry
}
```

2. Add effect state to `gameStore.ts`:
```typescript
interface GameStore {
  myEffects: MyEffect[];
  removeMyEffect: (id: string) => void;
}
```

3. Handle server message in `handleServerMessage()`:
```typescript
case ServerMessageType.MY_EFFECT:
  set((state) => ({
    myEffects: [...state.myEffects, { id: ..., ...message }],
  }));
  break;
```

4. Render in `Scene.tsx`:
```tsx
{myEffects.map((e) => (
  <MyEffect key={e.id} {...e} onComplete={() => removeMyEffect(e.id)} />
))}
```

### New UI Component

1. Create component in `components/ui/`:
```tsx
export function MyUI() {
  const someState = useGameStore((s) => s.someState);

  if (!shouldShow) return null;

  return (
    <div style={styles.overlay}>
      {/* UI content */}
    </div>
  );
}
```

2. Add to `App.tsx`:
```tsx
{connectionState === 'connected' && (
  <>
    <MyUI />
    {/* ... */}
  </>
)}
```

## Development

```bash
# Start dev server (from root)
npm run dev:client

# Or standalone
cd client && npm run dev

# Build
npm run build

# Tests (minimal currently)
npm run test
```

## Coordinate System Reference

Three.js uses right-handed coordinate system:
- **+X**: Right
- **+Y**: Up
- **-Z**: Forward (into screen)

Camera rotation:
- **Yaw**: Around Y axis (left/right look)
- **Pitch**: Around X axis (up/down look)
- Euler order: 'YXZ' for FPS controls

Player position in server state is at **center of body**, not feet. Camera is at `position.y + PLAYER_HEIGHT / 2` (eye level).
