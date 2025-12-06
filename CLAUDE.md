# Wizard Zone - Project Documentation

## Overview

Wizard Zone is a first-person multiplayer battle royale game where wizards cast dodgeable projectile spells. The last wizard standing wins. Built with a server-authoritative architecture running at 60Hz tick rate.

## Tech Stack

- **Client**: Vite + React + TypeScript + React Three Fiber + Drei + Zustand
- **Server**: Node.js + Express + TypeScript + ws (WebSocket)
- **Shared**: npm workspaces monorepo with shared types package
- **Testing**: Jest (server)

## Project Structure

```
wizard_zone_v2/
├── package.json                 # npm workspaces root
├── tsconfig.base.json           # Shared TS config
├── packages/
│   └── shared/                  # Shared types & constants
│       ├── src/
│       │   ├── index.ts         # Re-exports everything
│       │   ├── types/
│       │   │   ├── player.ts    # PlayerState, AbilityState
│       │   │   ├── projectile.ts # ProjectileState
│       │   │   ├── input.ts     # InputState, MovementInput, ActionInput
│       │   │   ├── messages.ts  # Server/Client message types
│       │   │   ├── vectors.ts   # Vec3
│       │   │   └── collision.ts # CollisionAABB, CollisionCylinder, CollisionResult
│       │   ├── constants/
│       │   │   ├── network.ts   # TICK_RATE, ports
│       │   │   ├── physics.ts   # GRAVITY, PLAYER_SPEED, etc.
│       │   │   └── abilities.ts # DASH, LAUNCH_JUMP, PRIMARY_FIRE
│       │   ├── data/
│       │   │   └── arenaCollision.ts # ARENA_COLLISION data (platforms, walls, cylinders)
│       │   └── utils/
│       │       └── collisionMath.ts  # Collision detection (2D for players, 3D for projectiles)
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx              # Main app with Canvas + UI overlays
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── HUD.tsx           # Health bar, abilities, kill feed
│   │   │   │   ├── MainMenu.tsx      # Join game screen
│   │   │   │   ├── DeathOverlay.tsx  # Spectator mode overlay
│       │   │   └── GameOverScreen.tsx # Winner announcement
│   │   │   └── three/
│   │   │       ├── Scene.tsx         # Main 3D scene, cameras, players
│   │   │       ├── Arena.tsx         # Ground, platforms, walls, pillars (visual only)
│   │   │       ├── Projectiles.tsx   # Fireball rendering with effects
│   │   │       └── InputController.tsx # Sends inputs at 60Hz
│   │   ├── hooks/
│   │   │   ├── useInput.ts           # Keyboard/mouse capture
│   │   │   └── useFirstPersonControls.ts # Pointer lock + mouse look
│   │   └── stores/
│   │       └── gameStore.ts          # Zustand store for all client state
└── server/
    ├── src/
    │   ├── index.ts              # Entry point
    │   ├── server.ts             # Express + WebSocket setup
    │   ├── game/
    │   │   └── GameRoom.ts       # Game loop, state management
    │   └── systems/
    │       ├── PhysicsSystem.ts       # Movement, gravity, abilities
    │       ├── ArenaCollisionSystem.ts # Platform/wall/pillar collision
    │       ├── ProjectileSystem.ts    # Projectile creation, movement
    │       ├── CollisionSystem.ts     # Hit detection, player pushing
    │       └── CombatSystem.ts        # Damage, death, win condition
    └── __tests__/
        └── systems/              # Unit tests for all systems
```

## Key Concepts

### Server-Authoritative Architecture

The server runs the authoritative game simulation at 60Hz. Clients send inputs, server processes them and broadcasts state.

**Game Loop** (`server/src/game/GameRoom.ts`):
1. Process pending inputs from all players
2. Update physics (gravity, movement, arena collision)
3. Update projectiles (position, lifetime, arena collision)
4. Check projectile-player collisions
5. Apply damage, check for deaths
6. Check win condition
7. Resolve player-player collisions
8. Update ability cooldowns
9. Broadcast state to all clients

### Coordinate System (Three.js)

- **Forward**: -Z direction
- **Right**: +X direction
- **Up**: +Y direction
- **Yaw**: Rotation around Y axis (positive = left/counter-clockwise from above)
- **Pitch**: Rotation around X axis (positive = look up)
- **Camera Euler order**: 'YXZ'

This is critical for understanding movement and projectile direction calculations.

### Input Flow

1. Client captures keyboard/mouse in `useInput.ts`
2. `InputController.tsx` calls `sendCurrentInput()` at 60Hz
3. Input sent via WebSocket to server
4. Server queues inputs in `pendingInputs` map
5. Each tick, `processInputs()` applies all pending inputs
6. Server broadcasts new state
7. Client updates `gameStore` with authoritative positions

### Ability System

Each ability has:
- `lastUsed`: Tick number when last used
- `ready`: Boolean for UI
- `cooldownRemaining`: Milliseconds remaining (for UI)

Cooldown is checked in ticks: `cooldownTicks = Math.ceil(COOLDOWN_MS / (1000 / 60))`

## Important Files to Understand

### `packages/shared/src/constants/physics.ts`
```typescript
export const PHYSICS = {
  GRAVITY: -30,
  PLAYER_SPEED: 8,
  JUMP_VELOCITY: 10,
  PLAYER_HEIGHT: 1.8,
  PLAYER_RADIUS: 0.4,
  AIR_CONTROL: 0.3,
  GROUND_FRICTION: 0.9,
  GROUND_LEVEL: 0,
};
```

### `packages/shared/src/constants/abilities.ts`
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
};
```

### `server/src/systems/PhysicsSystem.ts`

Key methods:
- `update()`: Apply gravity, integrate position, ground collision
- `applyMovementInput()`: Convert local WASD to world velocity based on yaw
- `applyJump()`: Set vertical velocity if grounded
- `applyDash()`: Burst of speed in movement/facing direction
- `applyLaunchJump()`: High vertical + forward boost
- `updateAbilityCooldowns()`: Update ready state for all abilities

**Movement Direction Formula** (critical for bugs):
```typescript
// Local input to world velocity
const sinYaw = Math.sin(yaw);
const cosYaw = Math.cos(yaw);
const worldX = localX * cosYaw + localZ * sinYaw;
const worldZ = -localX * sinYaw + localZ * cosYaw;
```

### `server/src/systems/ProjectileSystem.ts`

Handles projectile creation, movement, lifetime, and arena collision. Projectiles are destroyed when they hit walls, platforms, or cylinders.

Key methods:
- `createProjectile()`: Spawns projectile in front of player at eye level
- `update()`: Moves projectiles, checks arena collision, handles lifetime/bounds expiration
- `checkArenaCollision()`: Uses `sphereOverlapsAABB()` and `sphereOverlapsCylinder()` from shared utils

**Projectile Direction Formula** (critical for bugs):
```typescript
// Camera looking direction from yaw/pitch
const dirX = -sinYaw * cosPitch;
const dirY = sinPitch;
const dirZ = -cosYaw * cosPitch;
```

### `server/src/systems/ArenaCollisionSystem.ts`

Handles collision with arena geometry (platforms, walls, pillars). Called by PhysicsSystem after position integration.

**Algorithm:**
1. **Horizontal blocking**: Push player out of walls, platforms, and cylinders
2. **Landing**: When falling (vy <= 0), snap to highest valid surface
3. **Ceiling**: Stop upward velocity when head hits platform underside
4. **Ground fallback**: Snap to Y=0 if nothing else caught the player

**Key collision types:**
- `CollisionAABB`: Axis-aligned bounding box (platforms, walls, obstacles)
- `CollisionCylinder`: Cylindrical pillars

### `packages/shared/src/data/arenaCollision.ts`

Defines all collision geometry. Visual geometry in `Arena.tsx` must match!

- `walls[]`: Outer arena boundary (4 walls)
- `platforms[]`: All landable surfaces (cover obstacles, elevated platforms, etc.)
- `cylinders[]`: Decorative pillars (4 near center)

### `client/src/stores/gameStore.ts`

Zustand store containing:
- Connection state (socket, playerId, latency)
- Game state (localPlayer, remotePlayers, projectiles)
- Spectator state (isSpectating, spectateTargetId, killFeed, gameOver)
- Look direction (lookYaw, lookPitch) - synced from camera controls
- Input history for future client-side prediction

### `client/src/hooks/useFirstPersonControls.ts`

Handles:
- Pointer lock (click to capture mouse)
- Mouse movement to yaw/pitch
- Syncs look direction to gameStore (important: other code reads from store, not camera)

## Common Tasks

### Adding a New Ability

1. Add constants in `packages/shared/src/constants/abilities.ts`
2. Add to `AbilityState` interface in `packages/shared/src/types/player.ts`
3. Add to `createDefaultAbilityState()`
4. Add to `ActionInput` in `packages/shared/src/types/input.ts`
5. Implement in `server/src/systems/PhysicsSystem.ts` (or new system)
6. Call from `server/src/game/GameRoom.ts` in `applyInput()`
7. Add cooldown update in appropriate system
8. Add key binding in `client/src/hooks/useInput.ts`
9. Add UI indicator in `client/src/components/ui/HUD.tsx`
10. Write tests

### Adding a New Projectile Type

1. Add type to `ProjectileType` enum in shared
2. Update `ProjectileState` if needed
3. Create projectile in `ProjectileSystem.createProjectile()`
4. Handle differently in collision/damage if needed
5. Add visual variant in `client/src/components/three/Projectiles.tsx`

### Adding New Arena Geometry

1. Add visual mesh in `client/src/components/three/Arena.tsx`
2. Add collision data in `packages/shared/src/data/arenaCollision.ts`:
   - Use `createAABB([x, y, z], [width, height, depth])` for boxes
   - Add to `platforms[]` if landable from above
   - Add to `walls[]` if only blocking (not landable)
   - Use `createCylinder([x, y, z], height, radius)` for pillars
3. Rebuild shared: `npm run build:shared` (or use `npm run dev` for auto-rebuild)

### Debugging Movement Issues

Movement bugs are usually in:
1. `PhysicsSystem.applyMovementInput()` - check rotation formula
2. `useFirstPersonControls.ts` - check yaw/pitch are being set correctly
3. `useInput.ts` - ensure `getLookYaw()`/`getLookPitch()` read from store
4. `gameStore.ts` - ensure `setLook()` is being called

### Debugging Projectile Direction Issues

1. Check `ProjectileSystem.createProjectile()` direction calculation
2. Verify yaw/pitch values are correct in `InputState`
3. Check coordinate system assumptions (forward = -Z)

## Running the Project

```bash
# Install dependencies
npm install

# Development (builds shared + watches all packages)
npm run dev

# This runs concurrently:
# - watch:shared (rebuilds shared package on changes)
# - dev:server (tsx watch)
# - dev:client (vite)

# Or run individually
npm run dev:server
npm run dev:client

# Build shared package manually (if needed)
npm run build:shared

# Run tests
npm run test:server

# Build all
npm run build
```

**Important**: The shared package must be rebuilt when its files change. `npm run dev` handles this automatically with watch mode.

## Network Protocol

### Client → Server

| Message Type | Data |
|--------------|------|
| `join_game` | `{ playerName: string }` |
| `input` | `InputState` object |
| `ping` | `{ clientTime: number }` |

### Server → Client

| Message Type | Data |
|--------------|------|
| `welcome` | `{ playerId, serverTick, tickRate }` |
| `game_state` | `{ tick, players, projectiles }` |
| `player_died` | `{ playerId, killerId }` |
| `game_over` | `{ winnerId, winnerName }` |

## Known Limitations / Future Work

1. **No client-side prediction**: Movement feels responsive but could be smoother with prediction + reconciliation
2. **No interpolation**: Remote players jump between positions rather than smoothly interpolating
3. **Single room**: All players join the same game room
4. **No reconnection**: Disconnected players can't rejoin
5. **No lobby/ready system**: Game starts immediately when players join
6. **Simple hitboxes**: Players use sphere approximation, not capsules

## Testing

Tests are in `server/__tests__/systems/`. Currently 55 tests covering:
- PhysicsSystem: gravity, movement, jump, dash, launch jump, cooldowns
- ProjectileSystem: creation, movement, lifetime, cooldowns
- CollisionSystem: projectile-player hits, player pushing
- CombatSystem: damage, death, win condition

Run with: `npm run test:server`

## Architecture Decisions

1. **Why Zustand over Redux?**: Simpler API, less boilerplate, works well with React Three Fiber
2. **Why ws over Socket.io?**: Lighter weight, more control, sufficient for our needs
3. **Why server-authoritative?**: Prevents cheating, ensures consistent game state
4. **Why 60Hz tick rate?**: Smooth gameplay, matches typical monitor refresh
5. **Why shared package?**: Type safety between client/server, single source of truth for constants
