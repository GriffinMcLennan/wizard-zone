# Shared Package Documentation

## Overview

The shared package (`@wizard-zone/shared`) contains types, constants, and utilities used by both the client and server. It ensures type safety and consistency across the monorepo.

## Structure

```
packages/shared/src/
├── index.ts              # Re-exports everything
├── types/
│   ├── index.ts          # Re-exports all types
│   ├── player.ts         # PlayerState, AbilityState, PlayerId
│   ├── projectile.ts     # ProjectileState, ProjectileType
│   ├── input.ts          # InputState, MovementInput, ActionInput
│   ├── messages.ts       # Server/Client message types
│   ├── vectors.ts        # Vec3
│   └── collision.ts      # CollisionAABB, CollisionCylinder, etc.
├── constants/
│   ├── index.ts          # Re-exports all constants
│   ├── network.ts        # TICK_RATE, ports, buffer sizes
│   ├── physics.ts        # Movement constants
│   ├── abilities.ts      # Ability stats, player stats
│   └── game.ts           # Game rules (min players, countdown)
├── data/
│   ├── index.ts          # Re-exports data
│   └── arenaCollision.ts # Arena geometry definition
└── utils/
    ├── index.ts          # Re-exports utils
    ├── collisionMath.ts  # Collision detection functions
    └── abilityUtils.ts   # Cooldown and direction helpers
```

## Types

### player.ts

```typescript
type PlayerId = string;

interface AbilityCooldown {
  ready: boolean;
  cooldownRemaining: number;  // MS remaining (for UI)
  lastUsed: number;           // Tick when last used
}

interface AbilityState {
  dash: AbilityCooldown;
  launchJump: AbilityCooldown;
  primaryFire: AbilityCooldown;
  novaBlast: AbilityCooldown;
  arcaneRay: AbilityCooldown;
}

interface PlayerState {
  id: PlayerId;
  name: string;
  position: Vec3;       // Center of body
  velocity: Vec3;
  yaw: number;          // Horizontal look
  pitch: number;        // Vertical look
  health: number;
  maxHealth: number;
  isAlive: boolean;
  isGrounded: boolean;
  abilities: AbilityState;
  lastProcessedInput: number;  // For client reconciliation
  lastDamageTick: number;      // For health regen
}
```

### input.ts

```typescript
interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface LookInput {
  yaw: number;
  pitch: number;
}

interface ActionInput {
  jump: boolean;
  dash: boolean;
  launchJump: boolean;
  primaryFire: boolean;
  novaBlast: boolean;
  arcaneRay: boolean;
}

interface InputState {
  sequenceNumber: number;  // For ordering/reconciliation
  timestamp: number;       // Client timestamp
  movement: MovementInput;
  look: LookInput;
  actions: ActionInput;
}
```

### messages.ts

**Client -> Server:**
```typescript
enum ClientMessageType {
  JOIN_GAME = 'join_game',
  INPUT = 'input',
  PING = 'ping',
}
```

**Server -> Client:**
```typescript
enum ServerMessageType {
  WELCOME = 'welcome',
  GAME_STATE = 'game_state',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_DIED = 'player_died',
  GAME_OVER = 'game_over',
  GAME_PHASE_UPDATE = 'game_phase_update',
  COUNTDOWN_UPDATE = 'countdown_update',
  PONG = 'pong',
  ERROR = 'error',
  NOVA_BLAST = 'nova_blast',
  ARCANE_RAY = 'arcane_ray',
}

type GamePhase = 'waiting_for_players' | 'countdown' | 'playing';
```

### collision.ts

```typescript
interface CollisionAABB {
  type: 'aabb';
  min: Vec3;  // Lower corner
  max: Vec3;  // Upper corner
}

interface CollisionCylinder {
  type: 'cylinder';
  center: Vec3;   // Base center (y = 0 usually)
  radius: number;
  height: number;
}

interface CollisionResult {
  position: Vec3;
  velocity: Vec3;
  isGrounded: boolean;
}
```

## Constants

### network.ts

```typescript
export const NETWORK = {
  TICK_RATE: 60,              // Server tick rate
  TICK_INTERVAL_MS: 1000/60,  // ~16.67ms
  CLIENT_SEND_RATE: 60,       // Client input send rate
  INTERPOLATION_DELAY_MS: 100,
  MAX_INPUT_BUFFER_SIZE: 64,
  SNAPSHOT_BUFFER_SIZE: 32,
  DEFAULT_PORT: 3001,
};
```

### physics.ts

```typescript
export const PHYSICS = {
  PLAYER_SPEED: 8,       // Units per second
  JUMP_VELOCITY: 10,     // Vertical velocity on jump
  GRAVITY: -25,          // Negative (downward)
  GROUND_FRICTION: 0.9,  // Applied each tick when grounded
  AIR_CONTROL: 0.3,      // Reduced control while airborne
  PLAYER_HEIGHT: 1.8,    // Total height
  PLAYER_RADIUS: 0.4,    // Collision radius
  MAX_PITCH: Math.PI/2 - 0.1,  // Prevent camera flip
  GROUND_LEVEL: 0,       // Y position of ground
};
```

### abilities.ts

```typescript
export const ABILITIES = {
  DASH: {
    COOLDOWN_MS: 3000,
    DISTANCE: 8,
    DURATION_MS: 150,
  },
  LAUNCH_JUMP: {
    COOLDOWN_MS: 5000,
    VERTICAL_VELOCITY: 20,
    HORIZONTAL_BOOST: 5,
  },
  PRIMARY_FIRE: {
    COOLDOWN_MS: 500,
    PROJECTILE_SPEED: 30,
    DAMAGE: 25,
    LIFETIME_MS: 3000,
    RADIUS: 0.3,
  },
  NOVA_BLAST: {
    COOLDOWN_MS: 8000,
    DAMAGE: 40,
    RADIUS: 5,
  },
  ARCANE_RAY: {
    COOLDOWN_MS: 6000,
    DAMAGE: 35,
    RANGE: 200,  // Visual range only
  },
};

export const PLAYER = {
  MAX_HEALTH: 100,
  SPAWN_HEALTH: 100,
  HEALTH_REGEN: {
    DELAY_MS: 8000,       // Wait after damage
    RATE_PER_SECOND: 5,
  },
};
```

### game.ts

```typescript
export const GAME = {
  MIN_PLAYERS_TO_START: 2,
  COUNTDOWN_SECONDS: 5,
};
```

## Arena Collision Data (arenaCollision.ts)

Defines all collision geometry for the arena:

```typescript
const ARENA_SIZE = 60;
const WALL_HEIGHT = 15;

// Outer walls (4 sides)
const walls: CollisionAABB[] = [...];

// Platforms (landable surfaces)
const platforms: CollisionAABB[] = [
  // Cover obstacles near center (height 1.5)
  createAABB([-12, 0.75, 0], [2, 1.5, 4]),
  // Central elevated platform (Y=2)
  createAABB([0, 2, 0], [12, 0.5, 12]),
  // Corner platforms (lower Y=1.5, upper Y=4)
  // Side platforms (Y=2.5)
  // Floating platforms (Y=5)
  // Central tower (Y=6)
  ...
];

// Decorative pillars (4 near center)
const cylinders: CollisionCylinder[] = [
  createCylinder([-6, 0, -6], 6, 0.5),
  createCylinder([6, 0, -6], 6, 0.5),
  createCylinder([-6, 0, 6], 6, 0.5),
  createCylinder([6, 0, 6], 6, 0.5),
];

export const ARENA_COLLISION: ArenaCollisionData = {
  platforms,
  cylinders,
  walls,
};

export const ARENA_BOUNDS = ARENA_SIZE / 2;  // 30
```

## Utilities

### collisionMath.ts

```typescript
// 2D circle-AABB overlap (for player XZ collision)
circleOverlapsAABBXZ(x, z, radius, aabb): boolean

// Push player out of cylinder
resolveCylinderCollision(x, z, radius, cylinder): { x, z, collided }

// Push player out of wall/platform
resolveWallCollision(x, z, feetY, height, radius, wall): { x, z, collided }

// 3D sphere-AABB collision (for projectiles)
sphereOverlapsAABB(position, radius, aabb): boolean

// 3D sphere-cylinder collision (for projectiles)
sphereOverlapsCylinder(position, radius, cylinder): boolean

// 3D sphere-capsule collision (for projectile-player hits)
sphereOverlapsCapsule(
  spherePos, sphereRadius,
  capsuleBaseX, capsuleBaseY, capsuleBaseZ,
  capsuleHeight, capsuleRadius
): boolean
```

### abilityUtils.ts

```typescript
// Convert milliseconds to game ticks
cooldownMsToTicks(cooldownMs): number
// = Math.ceil(cooldownMs / (1000 / TICK_RATE))

// Convert ticks to milliseconds
ticksToMs(ticks): number
// = ticks * (1000 / TICK_RATE)

// Check if ability is off cooldown
isAbilityReady(lastUsed, cooldownMs, currentTick): boolean

// Calculate direction vector from yaw/pitch
getDirectionFromLook(yaw, pitch): Vec3
// Returns { x: -sin(yaw)*cos(pitch), y: sin(pitch), z: -cos(yaw)*cos(pitch) }
```

## Building

```bash
# Build once
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# From root, build all workspaces
npm run build:shared
```

**Output:** `dist/` folder with compiled JS and `.d.ts` type declarations.

## Adding New Content

### New Type

1. Create or edit file in `src/types/`
2. Export from `src/types/index.ts`
3. Will be auto-exported from main `src/index.ts`

### New Constant

1. Create or edit file in `src/constants/`
2. Export from `src/constants/index.ts`
3. Will be auto-exported from main `src/index.ts`

### New Utility Function

1. Add to existing file or create new file in `src/utils/`
2. Export from `src/utils/index.ts`
3. Will be auto-exported from main `src/index.ts`

### New Arena Geometry

1. Edit `src/data/arenaCollision.ts`
2. Use helper functions:
   - `createAABB([x, y, z], [width, height, depth])`
   - `createCylinder([x, y, z], height, radius)`
3. Add to appropriate array (`platforms`, `walls`, or `cylinders`)
4. **Important:** Must also update visual geometry in `client/src/components/three/Arena.tsx`

## Import Examples

```typescript
// Import everything
import {
  PlayerState,
  InputState,
  PHYSICS,
  ABILITIES,
  ARENA_COLLISION,
  sphereOverlapsAABB,
  cooldownMsToTicks,
} from '@wizard-zone/shared';

// Or import specific modules
import { Vec3 } from '@wizard-zone/shared/types';
import { NETWORK } from '@wizard-zone/shared/constants';
```
