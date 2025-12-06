# Wizard Zone - Project Documentation

## Overview

Wizard Zone is a first-person multiplayer battle royale game where wizards cast dodgeable projectile spells. The last wizard standing wins. Built with a server-authoritative architecture running at 60Hz tick rate.

**Game Features:**
- First-person movement with WASD + mouse look
- Multiple abilities: Dash, Launch Jump, Primary Fire (Fireball), Nova Blast (AOE), Arcane Ray (hitscan)
- Health regeneration after taking damage
- Automatic game phases: waiting for players, countdown, playing
- Spectator mode when eliminated
- Kill feed and battle royale-style alive count

## Tech Stack

- **Client**: Vite + React + TypeScript + React Three Fiber + Drei + Zustand
- **Server**: Node.js + Express + TypeScript + ws (WebSocket)
- **Shared**: npm workspaces monorepo with shared types package
- **Testing**: Jest (server), Vitest (client - configured but minimal)

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
│       │   │   ├── player.ts    # PlayerState, AbilityState, AbilityCooldown
│       │   │   ├── projectile.ts # ProjectileState, ProjectileType
│       │   │   ├── input.ts     # InputState, MovementInput, ActionInput, LookInput
│       │   │   ├── messages.ts  # Server/Client message types, GamePhase
│       │   │   ├── vectors.ts   # Vec3
│       │   │   └── collision.ts # CollisionAABB, CollisionCylinder, CollisionResult
│       │   ├── constants/
│       │   │   ├── network.ts   # TICK_RATE, ports
│       │   │   ├── physics.ts   # GRAVITY, PLAYER_SPEED, etc.
│       │   │   ├── abilities.ts # DASH, LAUNCH_JUMP, PRIMARY_FIRE, NOVA_BLAST, ARCANE_RAY, PLAYER
│       │   │   └── game.ts      # MIN_PLAYERS_TO_START, COUNTDOWN_SECONDS
│       │   ├── data/
│       │   │   └── arenaCollision.ts # ARENA_COLLISION data (platforms, walls, cylinders)
│       │   └── utils/
│       │       ├── collisionMath.ts  # Collision detection utilities
│       │       └── abilityUtils.ts   # Cooldown helpers, direction calculation
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx              # Main app with Canvas + UI overlays
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── HUD.tsx           # Health bar, abilities, kill feed, crosshair
│   │   │   │   ├── MainMenu.tsx      # Join game screen
│   │   │   │   ├── DeathOverlay.tsx  # Spectator mode overlay
│   │   │   │   ├── WaitingScreen.tsx # Waiting for players screen
│   │   │   │   └── GameOverScreen.tsx # Winner announcement
│   │   │   └── three/
│   │   │       ├── Scene.tsx         # Main 3D scene, cameras, players
│   │   │       ├── Arena.tsx         # Ground, platforms, walls, pillars (visual only)
│   │   │       ├── Projectiles.tsx   # Fireball rendering with effects
│   │   │       ├── InputController.tsx # Sends inputs at 60Hz
│   │   │       ├── NovaBlastEffect.tsx # AOE explosion visual effect
│   │   │       └── ArcaneRayEffect.tsx # Hitscan beam visual effect
│   │   ├── hooks/
│   │   │   ├── useInput.ts           # Keyboard/mouse capture
│   │   │   └── useFirstPersonControls.ts # Pointer lock + mouse look
│   │   └── stores/
│   │       └── gameStore.ts          # Zustand store for all client state
└── server/
    ├── src/
    │   ├── index.ts              # Entry point
    │   ├── server.ts             # Express + WebSocket setup
    │   ├── network/
    │   │   └── ConnectionManager.ts  # WebSocket connection handling
    │   ├── game/
    │   │   └── GameRoom.ts       # Game loop, state management, phases
    │   └── systems/
    │       ├── PhysicsSystem.ts       # Movement, gravity, dash, launch jump
    │       ├── ArenaCollisionSystem.ts # Platform/wall/pillar collision
    │       ├── ProjectileSystem.ts    # Projectile creation, movement
    │       ├── CollisionSystem.ts     # Hit detection, player pushing
    │       ├── CombatSystem.ts        # Damage, death, win condition
    │       ├── NovaBlastSystem.ts     # AOE ability (E key)
    │       ├── ArcaneRaySystem.ts     # Hitscan ability (R key)
    │       └── HealthRegenSystem.ts   # Health regeneration after damage
    └── __tests__/
        ├── systems/              # Unit tests for all systems
        │   ├── PhysicsSystem.test.ts
        │   ├── ProjectileSystem.test.ts
        │   ├── CollisionSystem.test.ts
        │   ├── CombatSystem.test.ts
        │   ├── NovaBlastSystem.test.ts
        │   ├── ArcaneRaySystem.test.ts
        │   └── HealthRegenSystem.test.ts
        └── game/
            └── GameRoom.spawn.test.ts
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
9. Update health regeneration
10. Broadcast state to all clients

### Game Phases

The game has three phases managed by `GameRoom`:

1. **`waiting_for_players`**: Players can join, waiting for minimum players (2)
2. **`countdown`**: Enough players joined, 5-second countdown before game starts
3. **`playing`**: Active battle royale game

Phase transitions:
- `waiting_for_players` -> `countdown`: When MIN_PLAYERS_TO_START (2) players connect
- `countdown` -> `playing`: After COUNTDOWN_SECONDS (5) elapses
- `playing` -> `countdown`: When game over (winner declared), starts countdown for next game
- `countdown` -> `waiting_for_players`: If players disconnect during countdown and count drops below minimum

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

**Current Abilities:**

| Ability | Key | Type | Cooldown | Effect |
|---------|-----|------|----------|--------|
| Primary Fire | LMB | Projectile | 500ms | 30 speed, 25 damage fireball |
| Dash | Shift | Movement | 3s | 8-unit burst in movement/facing direction |
| Launch Jump | Q | Movement | 5s | High vertical (20) + forward boost (5) |
| Nova Blast | E | AOE | 8s | 40 damage in 5-unit radius |
| Arcane Ray | R | Hitscan | 6s | 35 damage instant hit |

### Health Regeneration

Players regenerate health after not taking damage for a period:
- **Delay**: 8 seconds after last damage
- **Rate**: 5 HP per second
- **Max Health**: 100

Tracked via `lastDamageTick` on `PlayerState`.

## Important Files to Understand

### `packages/shared/src/constants/physics.ts`
```typescript
export const PHYSICS = {
  PLAYER_SPEED: 8,
  JUMP_VELOCITY: 10,
  GRAVITY: -25,
  GROUND_FRICTION: 0.9,
  AIR_CONTROL: 0.3,
  PLAYER_HEIGHT: 1.8,
  PLAYER_RADIUS: 0.4,
  MAX_PITCH: Math.PI / 2 - 0.1,
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
  NOVA_BLAST: {
    COOLDOWN_MS: 8000,
    DAMAGE: 40,
    RADIUS: 5,
  },
  ARCANE_RAY: {
    COOLDOWN_MS: 6000,
    DAMAGE: 35,
    RANGE: 200,  // Visual range (hit detection is infinite)
  },
};

export const PLAYER = {
  MAX_HEALTH: 100,
  SPAWN_HEALTH: 100,
  HEALTH_REGEN: {
    DELAY_MS: 8000,
    RATE_PER_SECOND: 5,
  },
};
```

### `packages/shared/src/constants/game.ts`
```typescript
export const GAME = {
  MIN_PLAYERS_TO_START: 2,
  COUNTDOWN_SECONDS: 5,
};
```

### `packages/shared/src/utils/abilityUtils.ts`

Key utility functions:
- `cooldownMsToTicks(cooldownMs)`: Convert MS to game ticks
- `ticksToMs(ticks)`: Convert ticks to MS
- `isAbilityReady(lastUsed, cooldownMs, currentTick)`: Check if ability is ready
- `getDirectionFromLook(yaw, pitch)`: Calculate direction vector from look angles

**Direction Formula (critical for projectiles/rays):**
```typescript
const cosPitch = Math.cos(pitch);
return {
  x: -Math.sin(yaw) * cosPitch,
  y: Math.sin(pitch),
  z: -Math.cos(yaw) * cosPitch,
};
```

### `server/src/systems/PhysicsSystem.ts`

Key methods:
- `update()`: Apply gravity, integrate position, arena collision
- `applyMovementInput()`: Convert local WASD to world velocity based on yaw
- `applyJump()`: Set vertical velocity if grounded
- `applyDash()`: Burst of speed in movement/facing direction
- `applyLaunchJump()`: High vertical + forward boost (must be grounded)
- `updateAbilityCooldowns()`: Update ready state for dash, launchJump, novaBlast, arcaneRay

**Movement Direction Formula:**
```typescript
const sinYaw = Math.sin(yaw);
const cosYaw = Math.cos(yaw);
const worldX = localX * cosYaw + localZ * sinYaw;
const worldZ = -localX * sinYaw + localZ * cosYaw;
```

### `server/src/systems/NovaBlastSystem.ts`

AOE attack centered on caster:
- Checks all players within `ABILITIES.NOVA_BLAST.RADIUS` (5 units)
- Uses 3D distance for hit detection
- Returns list of hit player IDs for damage application
- Server broadcasts `NOVA_BLAST` message for visual effect

### `server/src/systems/ArcaneRaySystem.ts`

Instant hitscan attack:
- Ray originates from caster's eye level
- Infinite range for hit detection
- Uses ray-cylinder intersection for player hitboxes
- Returns origin, endpoint, and hit player ID
- Server broadcasts `ARCANE_RAY` message for visual effect

### `server/src/systems/HealthRegenSystem.ts`

Passive regeneration:
- Only regenerates if `currentTick - lastDamageTick >= delayTicks` (8 seconds)
- Regenerates `RATE_PER_SECOND * deltaSeconds` HP per tick
- Caps at `maxHealth`

### `server/src/systems/ArenaCollisionSystem.ts`

Handles collision with arena geometry:

**Algorithm:**
1. **Horizontal blocking**: Push player out of walls, platforms, and cylinders
2. **Landing**: When falling (vy <= 0), snap to highest valid surface
3. **Ceiling**: Stop upward velocity when head hits platform underside
4. **Ground fallback**: Snap to Y=0 if nothing else caught the player

### `server/src/network/ConnectionManager.ts`

Handles WebSocket connections:
- Creates player IDs (UUID v4) on join
- Routes messages to GameRoom
- Manages connection lifecycle
- Sets up broadcaster for GameRoom to send to all clients

### `client/src/stores/gameStore.ts`

Zustand store containing:
- Connection state (socket, playerId, latency, connectionState)
- Game state (localPlayer, remotePlayers, projectiles)
- Game phase state (gamePhase, countdownSeconds, currentPlayerCount, minPlayers)
- Spectator state (isSpectating, spectateTargetId, killFeed, gameOver)
- Visual effects (novaBlasts, arcaneRays arrays)
- Look direction (lookYaw, lookPitch) - synced from camera controls
- Input history for future client-side prediction

### `client/src/hooks/useInput.ts`

**Key Bindings:**
| Key | Action |
|-----|--------|
| W / ArrowUp | Forward |
| S / ArrowDown | Backward |
| A | Left |
| D | Right |
| Space | Jump |
| Shift | Dash |
| Q | Launch Jump |
| E | Nova Blast |
| R | Arcane Ray |
| LMB | Primary Fire |
| Left/Right Arrow | Cycle spectate target (when dead) |

## Common Tasks

### Adding a New Ability

1. Add constants in `packages/shared/src/constants/abilities.ts`
2. Add to `AbilityState` interface in `packages/shared/src/types/player.ts`
3. Add to `createDefaultAbilityState()`
4. Add to `ActionInput` in `packages/shared/src/types/input.ts`
5. Create new system in `server/src/systems/` (e.g., `MyAbilitySystem.ts`)
6. Import and instantiate system in `server/src/game/GameRoom.ts`
7. Call from `applyInput()` in GameRoom
8. If visual effect needed, add message type in `packages/shared/src/types/messages.ts`
9. Handle message in `client/src/stores/gameStore.ts`
10. Create visual component in `client/src/components/three/`
11. Add key binding in `client/src/hooks/useInput.ts`
12. Add to HUD in `client/src/components/ui/HUD.tsx`
13. Add cooldown update in `PhysicsSystem.updateAbilityCooldowns()`
14. Write tests in `server/__tests__/systems/`

### Adding a New Projectile Type

1. Add type to `ProjectileType` enum in `packages/shared/src/types/projectile.ts`
2. Update `ProjectileState` if new properties needed
3. Create projectile variant in `ProjectileSystem.createProjectile()`
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

### Debugging Projectile/Ray Direction Issues

1. Check `ProjectileSystem.createProjectile()` or `ArcaneRaySystem.fireArcaneRay()` direction calculation
2. Verify yaw/pitch values are correct in `InputState`
3. Check `getDirectionFromLook()` in `packages/shared/src/utils/abilityUtils.ts`
4. Remember: forward = -Z in Three.js coordinate system

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
npm run test:client  # (minimal tests currently)

# Build all
npm run build
```

**Important**: The shared package must be rebuilt when its files change. `npm run dev` handles this automatically with watch mode.

## Network Protocol

### Client -> Server Messages

| Message Type | Data |
|--------------|------|
| `join_game` | `{ playerName: string }` |
| `input` | `InputState` object |
| `ping` | `{ clientTime: number }` |

### Server -> Client Messages

| Message Type | Data |
|--------------|------|
| `welcome` | `{ playerId, serverTick, tickRate }` |
| `game_state` | `{ tick, timestamp, players, projectiles }` |
| `player_joined` | `{ player: PlayerState }` |
| `player_left` | `{ playerId }` |
| `player_died` | `{ playerId, killerId }` |
| `game_over` | `{ winnerId, winnerName }` |
| `game_phase_update` | `{ phase, minPlayers, currentPlayers }` |
| `countdown_update` | `{ secondsRemaining }` |
| `pong` | `{ clientTime, serverTime }` |
| `error` | `{ message }` |
| `nova_blast` | `{ casterId, position, radius }` |
| `arcane_ray` | `{ casterId, origin, endpoint, hitPlayerId }` |

## Known Limitations / Future Work

1. **No client-side prediction**: Movement feels responsive but could be smoother with prediction + reconciliation
2. **No interpolation**: Remote players jump between positions rather than smoothly interpolating
3. **Single room**: All players join the same game room
4. **No reconnection**: Disconnected players can't rejoin
5. **Simple hitboxes**: Players use capsule approximation for projectiles, cylinder for arcane ray
6. **No arena collision for arcane ray**: Ray passes through walls/platforms

## Testing

Tests are in `server/__tests__/systems/`. Run with: `npm run test:server`

**Test Coverage:**
- PhysicsSystem: gravity, movement, jump, dash, launch jump, cooldowns
- ProjectileSystem: creation, movement, lifetime, arena collision, cooldowns
- CollisionSystem: projectile-player hits (sphere-capsule), player pushing
- CombatSystem: damage, death tracking, win condition
- NovaBlastSystem: AOE damage, cooldown, self-exclusion
- ArcaneRaySystem: hitscan, ray-cylinder intersection, cooldown
- HealthRegenSystem: regen delay, rate, capping at max health
- GameRoom.spawn: Random spawn position tests

## Architecture Decisions

1. **Why Zustand over Redux?**: Simpler API, less boilerplate, works well with React Three Fiber
2. **Why ws over Socket.io?**: Lighter weight, more control, sufficient for our needs
3. **Why server-authoritative?**: Prevents cheating, ensures consistent game state
4. **Why 60Hz tick rate?**: Smooth gameplay, matches typical monitor refresh
5. **Why shared package?**: Type safety between client/server, single source of truth for constants
6. **Why separate systems?**: Single responsibility, easier testing, cleaner game loop
7. **Why ConnectionManager?**: Separation of network concerns from game logic
