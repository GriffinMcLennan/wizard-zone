# Wizard Zone - Refactoring Guide

This document outlines identified refactoring opportunities in the codebase, prioritized by impact and complexity.

---

## Summary Table

| # | Refactor | Complexity | Impact | Status |
|---|----------|------------|--------|--------|
| ~~1~~ | ~~Extract cooldown logic~~ | ~~Low~~ | ~~High~~ | **DONE** |
| ~~2~~ | ~~Standardize ability interface~~ | ~~Medium~~ | ~~High~~ | **DONE** |
| 3 | Split GameRoom.ts | High | High | Pending |
| 4 | Simplify ray intersection | Medium | Medium | Pending |
| 5 | Handler registry pattern | Medium | Medium | Pending |
| 6 | Extract magic numbers | Low | Medium | Pending |
| 7 | Split Scene.tsx | Low | Medium | Pending |
| 8 | Add network tests | Medium | High | Pending |
| 9 | Break up collision system | Low | Medium | Pending |
| 10 | Split Zustand store | Medium | Medium | Pending |

---

## ~~1. Extract Ability Cooldown Logic (DRY)~~ - COMPLETED

**Status:** Completed

**Changes made:**
- Exported `NEVER_USED` constant from `packages/shared/src/types/player.ts`
- Added `recordAbilityUse()` and `updateAbilityCooldown()` to `packages/shared/src/utils/abilityUtils.ts`
- Fixed `isAbilityReady()` to work correctly with `NEVER_USED` initial value
- All ability systems now use shared utilities instead of duplicated patterns

---

## ~~2. Standardize Ability System Interface~~ - COMPLETED

**Status:** Completed

**Changes made:**
- Created `server/src/systems/CooldownSystem.ts` with centralized `updateAllCooldowns()` method
- Removed `updateAbilityCooldowns()` and `updateSingleAbilityCooldown()` from `PhysicsSystem.ts`
- Removed `updateCooldowns()` from `ProjectileSystem.ts`
- Updated `GameRoom.ts` to use single `CooldownSystem.updateAllCooldowns()` call
- Added comprehensive tests in `server/__tests__/systems/CooldownSystem.test.ts`

---

## 3. Split GameRoom.ts (522 lines)

**Priority:** High
**Complexity:** High
**File:** `server/src/game/GameRoom.ts`

### Problem

This class handles too many concerns:
- Game state management (players, projectiles, tick)
- Phase transitions (waiting, countdown, playing)
- Input processing (105-line `applyInput()` method)
- System orchestration (67-line `tick()` method)
- Broadcasting state to clients

### Solution

Extract into focused classes:

```
server/src/game/
├── GameRoom.ts           # Lightweight orchestrator (reduced to ~150 lines)
├── GamePhaseManager.ts   # Phase transitions, countdown logic
├── InputProcessor.ts     # Process and apply player inputs
└── SystemOrchestrator.ts # Coordinate system updates in tick
```

**GamePhaseManager.ts:**
```typescript
export class GamePhaseManager {
  private phase: GamePhase = 'waiting_for_players';
  private countdownTicks: number = 0;

  checkAutoStart(playerCount: number, minPlayers: number): void;
  updateCountdown(deltaTime: number): boolean; // returns true if countdown finished
  startNewGame(): void;
  endGame(): void;
  getPhase(): GamePhase;
}
```

**InputProcessor.ts:**
```typescript
export class InputProcessor {
  constructor(
    private physics: PhysicsSystem,
    private projectiles: ProjectileSystem,
    private novaBlast: NovaBlastSystem,
    private arcaneRay: ArcaneRaySystem,
    private combat: CombatSystem
  ) {}

  applyInput(player: PlayerState, input: InputState, currentTick: number): void;
  private applyMovementInput(player: PlayerState, input: InputState): void;
  private applyAbilityInput(player: PlayerState, input: InputState, currentTick: number): void;
}
```

### Tests to Write First

```typescript
// server/__tests__/game/GamePhaseManager.test.ts
describe('GamePhaseManager', () => {
  it('transitions from waiting to countdown when min players reached');
  it('transitions from countdown to playing when countdown ends');
  it('transitions back to waiting if players disconnect during countdown');
});

// server/__tests__/game/InputProcessor.test.ts
describe('InputProcessor', () => {
  it('applies movement input to player');
  it('triggers dash when shift pressed and ready');
  it('creates projectile when primary fire pressed');
});
```

---

## 4. Simplify ArcaneRaySystem Ray-Cylinder Intersection

**Priority:** Medium
**Complexity:** Medium
**File:** `server/src/systems/ArcaneRaySystem.ts` (lines 118-237)

### Problem

The `rayIntersectsPlayer()` method is 74 lines of complex math with:
- Nested conditionals
- Magic numbers (`0.0001` tolerance)
- No comments explaining the geometric algorithm
- Edge case handling mixed with main logic

### Solution

Break into smaller, documented functions:

```typescript
/**
 * Tests if a ray intersects a player's cylindrical hitbox.
 * Uses ray-cylinder intersection algorithm:
 * 1. Project ray onto XZ plane for cylinder side intersection
 * 2. Solve quadratic equation for intersection points
 * 3. Check if intersection Y is within cylinder height
 * 4. Check cap intersections for rays hitting top/bottom
 */
rayIntersectsPlayer(
  origin: Vec3,
  direction: Vec3,
  target: PlayerState
): { hit: boolean; distance: number } {
  const cylinder = this.getPlayerCylinder(target);

  // Check side intersection first (most common case)
  const sideResult = this.rayIntersectsCylinderSide(origin, direction, cylinder);
  if (sideResult.hit) {
    return sideResult;
  }

  // Check cap intersections for steep angles
  return this.rayIntersectsCylinderCaps(origin, direction, cylinder);
}

private rayIntersectsCylinderSide(
  origin: Vec3,
  direction: Vec3,
  cylinder: Cylinder
): { hit: boolean; distance: number } {
  // ... focused implementation with comments
}

private rayIntersectsCylinderCaps(
  origin: Vec3,
  direction: Vec3,
  cylinder: Cylinder
): { hit: boolean; distance: number } {
  // ... focused implementation with comments
}
```

Also extract magic numbers:

```typescript
// packages/shared/src/constants/physics.ts
export const COLLISION = {
  RAY_EPSILON: 0.0001,  // Tolerance for parallel ray detection
  DISTANCE_EPSILON: 0.001,  // Minimum distance for collision
};
```

### Tests to Write First

```typescript
// server/__tests__/systems/ArcaneRaySystem.test.ts
describe('rayIntersectsCylinderSide', () => {
  it('detects hit on cylinder side');
  it('returns false for parallel ray');
  it('returns false for ray missing cylinder');
});

describe('rayIntersectsCylinderCaps', () => {
  it('detects hit on top cap');
  it('detects hit on bottom cap');
  it('returns false for ray between caps');
});
```

---

## 5. Handler Registry Pattern for Server Messages

**Priority:** Medium
**Complexity:** Medium
**File:** `client/src/stores/gameStore.ts` (lines 242-387)

### Problem

A 145-line switch statement handles 11+ message types:
- Hard to extend (adding a message type = editing giant function)
- Unsafe type casting: `const msg = message as WelcomeMessage`
- Poor separation of concerns
- Difficult to test individual handlers

### Solution

Implement a handler registry pattern:

```typescript
// client/src/stores/messageHandlers.ts
import { StateCreator } from 'zustand';

type MessageHandler = (
  message: ServerMessage,
  set: (partial: Partial<GameState>) => void,
  get: () => GameState
) => void;

const handleWelcome: MessageHandler = (message, set) => {
  const { playerId, serverTick, tickRate } = message as WelcomeMessage;
  set({
    playerId,
    serverTick,
    tickRate,
    connectionState: 'connected',
  });
};

const handleGameState: MessageHandler = (message, set, get) => {
  const { players, projectiles, tick } = message as GameStateMessage;
  const playerId = get().playerId;
  // ... update logic
};

export const messageHandlers: Record<ServerMessageType, MessageHandler> = {
  [ServerMessageType.WELCOME]: handleWelcome,
  [ServerMessageType.GAME_STATE]: handleGameState,
  [ServerMessageType.PLAYER_JOINED]: handlePlayerJoined,
  [ServerMessageType.PLAYER_LEFT]: handlePlayerLeft,
  [ServerMessageType.PLAYER_DIED]: handlePlayerDied,
  [ServerMessageType.GAME_OVER]: handleGameOver,
  [ServerMessageType.GAME_PHASE_UPDATE]: handleGamePhaseUpdate,
  [ServerMessageType.COUNTDOWN_UPDATE]: handleCountdownUpdate,
  [ServerMessageType.PONG]: handlePong,
  [ServerMessageType.ERROR]: handleError,
  [ServerMessageType.NOVA_BLAST]: handleNovaBlast,
  [ServerMessageType.ARCANE_RAY]: handleArcaneRay,
};

// In gameStore.ts
const handleServerMessage = (message: ServerMessage, set: SetFn, get: GetFn) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, set, get);
  } else {
    console.warn(`Unknown message type: ${message.type}`);
  }
};
```

### Tests to Write First

```typescript
// client/__tests__/stores/messageHandlers.test.ts
describe('handleWelcome', () => {
  it('sets playerId from message');
  it('sets connectionState to connected');
});

describe('handleGameState', () => {
  it('updates local player from players map');
  it('updates remote players excluding local player');
  it('updates projectiles');
});
```

---

## 6. Extract Magic Numbers to Constants

**Priority:** Medium
**Complexity:** Low
**Files affected:** Multiple

### Problem

Hardcoded values scattered throughout the codebase:

| Location | Value | Purpose |
|----------|-------|---------|
| `GameRoom.ts:168-180` | `40`, `7` | Spawn area size, exclusion zone |
| `ProjectileSystem.ts:77` | `100` | Max projectile distance |
| `Scene.tsx:127-128` | `8`, `4` | Spectator camera distance/height |
| `useFirstPersonControls.ts:52` | `0.002` | Mouse sensitivity |
| `PhysicsSystem.ts:139` | `0.1` | Velocity magnitude threshold |
| `CollisionSystem.ts:95` | `0.001` | Distance epsilon |
| `ArenaCollisionSystem.ts:57,72` | `0.5` | Near-surface buffer |

### Solution

Create organized constants:

```typescript
// packages/shared/src/constants/game.ts
export const GAME = {
  MIN_PLAYERS_TO_START: 2,
  COUNTDOWN_SECONDS: 5,
  SPAWN: {
    AREA_SIZE: 40,           // -20 to 20 range
    CENTER_EXCLUSION: 7,     // Avoid spawning on center platform
  },
};

// packages/shared/src/constants/physics.ts
export const PHYSICS = {
  // ... existing values
  VELOCITY_THRESHOLD: 0.1,    // Minimum velocity to consider movement
  NEAR_SURFACE_BUFFER: 0.5,   // Buffer for surface detection
};

export const COLLISION = {
  DISTANCE_EPSILON: 0.001,
  RAY_EPSILON: 0.0001,
};

// packages/shared/src/constants/projectile.ts
export const PROJECTILE = {
  MAX_DISTANCE: 100,  // Projectiles destroyed beyond this distance
};

// client/src/constants/camera.ts
export const CAMERA = {
  SPECTATOR: {
    DISTANCE: 8,
    HEIGHT: 4,
  },
  MOUSE_SENSITIVITY: 0.002,
};
```

### Tests

No new tests needed - existing tests should continue to pass after constant extraction.

---

## 7. Split Scene.tsx (286 lines)

**Priority:** Medium
**Complexity:** Low
**File:** `client/src/components/three/Scene.tsx`

### Problem

Single file contains multiple distinct components:
- `FirstPersonCamera` (lines 94-111) - 17 lines
- `SpectatorCamera` (lines 113-149) - 36 lines
- `RemotePlayerMesh` (lines 151-285) - 134 lines with animation logic

### Solution

Extract to separate files:

```
client/src/components/three/
├── Scene.tsx              # Main scene composition (~100 lines)
├── FirstPersonCamera.tsx  # First-person camera logic
├── SpectatorCamera.tsx    # Spectator orbit camera
└── RemotePlayerMesh.tsx   # Remote player rendering with animations
```

**FirstPersonCamera.tsx:**
```typescript
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../../stores/gameStore';

interface FirstPersonCameraProps {
  position: [number, number, number];
}

export function FirstPersonCamera({ position }: FirstPersonCameraProps) {
  const { camera } = useThree();
  const lookYaw = useGameStore((state) => state.lookYaw);
  const lookPitch = useGameStore((state) => state.lookPitch);

  useFrame(() => {
    camera.position.set(...position);
    camera.rotation.set(lookPitch, lookYaw, 0, 'YXZ');
  });

  return null;
}
```

---

## 8. Add Missing Test Coverage for Network Layer

**Priority:** High
**Complexity:** Medium
**Files:** `ConnectionManager.ts`, `gameStore.ts`, hooks

### Problem

Critical network code has no test coverage:
- WebSocket connection lifecycle
- Message parsing and error handling
- Store message handlers
- Input hook key bindings
- First-person controls pointer lock

### Solution

Add comprehensive tests:

```typescript
// server/__tests__/network/ConnectionManager.test.ts
describe('ConnectionManager', () => {
  describe('handleConnection', () => {
    it('assigns unique player ID on connection');
    it('sends welcome message to new client');
    it('notifies game room of new player');
  });

  describe('handleMessage', () => {
    it('parses valid JSON messages');
    it('handles invalid JSON gracefully');
    it('routes messages to game room');
  });

  describe('handleDisconnect', () => {
    it('removes player from game room');
    it('cleans up connection state');
  });

  describe('broadcast', () => {
    it('sends message to all connected clients');
    it('skips disconnected clients');
  });
});

// client/__tests__/hooks/useInput.test.ts
describe('useInput', () => {
  it('sets forward true on W keydown');
  it('sets forward false on W keyup');
  it('handles simultaneous key presses');
  it('sets primaryFire on mouse down');
  it('clears primaryFire on mouse up');
});
```

### Mock Setup

```typescript
// server/__tests__/mocks/WebSocket.ts
export class MockWebSocket {
  readyState = 1; // OPEN
  send = jest.fn();
  close = jest.fn();
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
}

// client/__tests__/mocks/gameStore.ts
export const createMockStore = () => ({
  setLook: jest.fn(),
  sendCurrentInput: jest.fn(),
  // ... other methods
});
```

---

## 9. Break Up ArenaCollisionSystem.resolveCollisions()

**Priority:** Medium
**Complexity:** Low
**File:** `server/src/systems/ArenaCollisionSystem.ts` (lines 22-105)

### Problem

83-line method with four distinct collision phases:
1. Horizontal blocking (walls, platforms, cylinders)
2. Landing (snap to surfaces when falling)
3. Ceiling collision (stop upward velocity)
4. Ground fallback (snap to Y=0)

Heavy nesting and magic numbers make it hard to follow.

### Solution

Extract private methods for each phase:

```typescript
resolveCollisions(player: PlayerState): void {
  this.resolveHorizontalBlocking(player);
  this.resolveLanding(player);
  this.resolveCeilingCollision(player);
  this.resolveGroundFallback(player);
}

private resolveHorizontalBlocking(player: PlayerState): void {
  const playerCylinder = this.getPlayerCylinder(player);

  for (const platform of ARENA_COLLISION.platforms) {
    this.pushOutOfAABB(player, playerCylinder, platform);
  }

  for (const wall of ARENA_COLLISION.walls) {
    this.pushOutOfAABB(player, playerCylinder, wall);
  }

  for (const cylinder of ARENA_COLLISION.cylinders) {
    this.pushOutOfCylinder(player, playerCylinder, cylinder);
  }
}

private resolveLanding(player: PlayerState): void {
  if (player.velocity.y > 0) return; // Only check when falling

  const feetY = player.position.y;
  let highestSurface = -Infinity;

  // Check platforms
  for (const platform of ARENA_COLLISION.platforms) {
    const surfaceY = this.getSurfaceYIfAbove(player, platform);
    if (surfaceY !== null && surfaceY > highestSurface) {
      highestSurface = surfaceY;
    }
  }

  // ... similar for cylinders

  if (highestSurface > -Infinity) {
    player.position.y = highestSurface;
    player.velocity.y = 0;
    player.isGrounded = true;
  }
}

private resolveCeilingCollision(player: PlayerState): void {
  if (player.velocity.y <= 0) return; // Only check when rising

  const headY = player.position.y + PHYSICS.PLAYER_HEIGHT;

  for (const platform of ARENA_COLLISION.platforms) {
    if (this.isHeadHittingPlatform(headY, player.position, platform)) {
      player.velocity.y = 0;
      return;
    }
  }
}

private resolveGroundFallback(player: PlayerState): void {
  if (player.position.y < PHYSICS.GROUND_LEVEL) {
    player.position.y = PHYSICS.GROUND_LEVEL;
    player.velocity.y = 0;
    player.isGrounded = true;
  }
}
```

### Tests to Write First

```typescript
// server/__tests__/systems/ArenaCollisionSystem.test.ts
describe('resolveHorizontalBlocking', () => {
  it('pushes player out of wall');
  it('pushes player out of platform side');
  it('pushes player out of cylinder');
});

describe('resolveLanding', () => {
  it('snaps falling player to platform top');
  it('ignores platforms when player moving up');
  it('chooses highest surface when multiple options');
});

describe('resolveCeilingCollision', () => {
  it('stops upward velocity when head hits platform');
  it('ignores ceiling when player moving down');
});
```

---

## 10. Split Zustand Store

**Priority:** Medium
**Complexity:** Medium
**File:** `client/src/stores/gameStore.ts`

### Problem

Monolithic store with 44 state properties mixing:
- Connection state (socket, playerId, latency)
- Game state (localPlayer, remotePlayers, projectiles)
- Phase state (gamePhase, countdownSeconds)
- Spectator state (isSpectating, spectateTargetId, killFeed)
- Visual effects (novaBlasts, arcaneRays)

### Solution

Split into focused stores:

```
client/src/stores/
├── useConnectionStore.ts   # Socket, playerId, latency
├── useGameStore.ts         # Players, projectiles (main game state)
├── usePhaseStore.ts        # Game phase, countdown
├── useSpectatorStore.ts    # Death/spectate state, kill feed
└── useEffectsStore.ts      # Visual effects (nova blasts, arcane rays)
```

**useConnectionStore.ts:**
```typescript
interface ConnectionState {
  socket: WebSocket | null;
  playerId: string | null;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  latency: number;
  serverTick: number;
  tickRate: number;
}

interface ConnectionActions {
  connect: (url: string, playerName: string) => void;
  disconnect: () => void;
  updateLatency: (latency: number) => void;
}

export const useConnectionStore = create<ConnectionState & ConnectionActions>((set, get) => ({
  // ... focused implementation
}));
```

**useGameStore.ts:**
```typescript
interface GameState {
  localPlayer: PlayerState | null;
  remotePlayers: Map<string, PlayerState>;
  projectiles: Map<string, ProjectileState>;
  lookYaw: number;
  lookPitch: number;
}

interface GameActions {
  updateFromServer: (players: PlayerState[], projectiles: ProjectileState[]) => void;
  setLook: (yaw: number, pitch: number) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // ... focused implementation
}));
```

### Migration Strategy

1. Create new stores with subsets of current state
2. Update imports in components one at a time
3. Keep old store working during migration
4. Remove old store when migration complete

---

## Recommended Execution Order

For a test-driven approach, tackle these in order:

### Phase 1: Foundation (Low Risk, High Value)
1. **#6 Extract magic numbers** - Quick win, no behavior change
2. **#1 Extract cooldown logic** - Write tests first, then refactor

### Phase 2: Server Architecture
3. **#2 Standardize ability interface** - Creates cleaner patterns
4. **#9 Break up collision system** - Improves readability
5. **#4 Simplify ray intersection** - Reduces complexity

### Phase 3: Client Architecture
6. **#7 Split Scene.tsx** - Simple file organization
7. **#5 Handler registry pattern** - Improves extensibility
8. **#10 Split Zustand store** - Better state management

### Phase 4: Major Refactors
9. **#3 Split GameRoom.ts** - Biggest change, do last
10. **#8 Add network tests** - Can be done incrementally throughout

---

## Testing Strategy

For each refactor:

1. **Write failing tests first** (Red)
2. **Make tests pass with minimal code** (Green)
3. **Refactor while keeping tests green** (Refactor)

Use these test commands:
```bash
# Server tests
npm run test:server

# Watch mode for TDD
npm run test:server -- --watch

# Single file
npm run test:server -- --testPathPattern=CooldownSystem
```
