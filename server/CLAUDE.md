# Server Documentation

## Overview

The server is the authoritative game simulation running at 60Hz. It processes player inputs, updates game state, and broadcasts to all connected clients.

## Architecture

```
server/src/
├── index.ts              # Entry point - starts server on PORT
├── server.ts             # Express + WebSocket setup, creates GameRoom
├── network/
│   └── ConnectionManager.ts  # WebSocket connection lifecycle
├── game/
│   └── GameRoom.ts       # Main game loop and state management
└── systems/
    ├── PhysicsSystem.ts       # Movement, gravity, abilities
    ├── ArenaCollisionSystem.ts # Platform/wall/pillar collision
    ├── ProjectileSystem.ts    # Projectile creation and movement
    ├── CollisionSystem.ts     # Hit detection, player pushing
    ├── CombatSystem.ts        # Damage and death handling
    ├── NovaBlastSystem.ts     # AOE ability
    ├── ArcaneRaySystem.ts     # Hitscan ability
    └── HealthRegenSystem.ts   # Passive health regeneration
```

## Game Loop (GameRoom.ts)

The `tick()` method runs every ~16.67ms (60Hz):

```typescript
private tick(): void {
  this.currentTick++;

  // Only process game logic during 'playing' phase
  if (this.phase !== 'playing') {
    this.broadcastState();
    return;
  }

  // 1. Process all pending inputs
  this.processInputs();

  // 2. Update physics (movement, gravity, arena collision)
  this.physicsSystem.update(this.players, deltaSeconds);

  // 3. Update projectiles (position, lifetime, arena collision)
  const expiredProjectiles = this.projectileSystem.update(...);

  // 4. Check projectile-player collisions
  const hits = this.collisionSystem.checkProjectileCollisions(...);

  // 5. Apply damage, handle deaths
  for (const hit of hits) {
    const death = this.combatSystem.applyHit(...);
    if (death) this.handleDeath(death);
  }

  // 6. Resolve player-player pushing
  this.collisionSystem.resolvePlayerCollisions(this.players);

  // 7. Update ability cooldowns
  this.projectileSystem.updateCooldowns(...);
  this.physicsSystem.updateAbilityCooldowns(...);

  // 8. Update health regeneration
  this.healthRegenSystem.update(...);

  // 9. Broadcast state
  this.broadcastState();
}
```

## Systems

### PhysicsSystem

Handles all player movement physics.

**Methods:**
- `update(players, deltaSeconds)`: Apply gravity, integrate position, resolve arena collision
- `applyMovementInput(player, forward, backward, left, right, yaw)`: Convert WASD to world velocity
- `applyJump(player)`: Set vertical velocity if grounded
- `applyDash(player, yaw, currentTick)`: Burst movement in direction
- `applyLaunchJump(player, yaw, currentTick)`: High vertical + forward boost
- `updateAbilityCooldowns(players, currentTick)`: Update ready state for movement abilities

**Key Implementation Details:**

Movement uses rotation matrix to convert local input to world direction:
```typescript
const sinYaw = Math.sin(yaw);
const cosYaw = Math.cos(yaw);
const worldX = localX * cosYaw + localZ * sinYaw;
const worldZ = -localX * sinYaw + localZ * cosYaw;
```

Air control is additive with speed cap:
```typescript
if (!player.isGrounded && hasInput) {
  player.velocity.x += worldX * PLAYER_SPEED * AIR_CONTROL;
  player.velocity.z += worldZ * PLAYER_SPEED * AIR_CONTROL;
  // Cap horizontal speed
}
```

### ArenaCollisionSystem

Resolves collision with arena geometry (imported from shared package).

**Algorithm:**
1. **Horizontal blocking**: Check walls, platforms, cylinders. Push player out if overlapping.
2. **Landing**: When falling (vy <= 0), find highest valid surface player is above.
3. **Ceiling**: When jumping (vy > 0), stop if head hits platform underside.
4. **Ground fallback**: Snap to Y=0 if nothing else caught player.

Uses shared collision math utilities:
- `resolveWallCollision()`: Push out of AABBs
- `resolveCylinderCollision()`: Push out of cylinders
- `circleOverlapsAABBXZ()`: 2D overlap check for landing

### ProjectileSystem

Manages projectile lifecycle.

**Methods:**
- `createProjectile(owner, tick)`: Spawn fireball at eye level in look direction
- `update(projectiles, currentTick, deltaSeconds)`: Move, check lifetime, check arena collision
- `canFire(player, currentTick)`: Check primary fire cooldown
- `recordFire(player, currentTick)`: Record usage for cooldown
- `updateCooldowns(players, currentTick)`: Update ready state

**Projectile Creation:**
```typescript
const dir = getDirectionFromLook(owner.yaw, owner.pitch);
projectile = {
  position: owner.position + dir * spawnDistance,
  velocity: dir * PROJECTILE_SPEED,
  // ...
};
```

### CollisionSystem

Handles projectile-player and player-player collisions.

**Projectile-Player:**
- Uses `sphereOverlapsCapsule()` for accurate hitbox
- Player hitbox is a capsule (cylinder with hemispherical caps)
- Returns list of hits with projectile ID, player ID, owner ID, damage

**Player-Player:**
- Simple circle-circle collision in XZ plane
- Pushes overlapping players apart equally

### CombatSystem

Handles damage application and win condition.

**Methods:**
- `applyHit(players, victimId, killerId, damage, currentTick)`: Apply damage, return death event if killed
- `checkWinCondition(players)`: Return winner ID if only one player alive
- `getAliveCount(players)`: Count alive players

**Death tracking:**
- Sets `player.health = 0` and `player.isAlive = false`
- Returns `{ victimId, killerId }` for kill feed

### NovaBlastSystem

AOE damage ability.

**Logic:**
1. Check cooldown
2. Record ability usage
3. Find all alive players (except caster) within radius
4. Return list of hit player IDs and damage amount
5. GameRoom applies damage and broadcasts visual effect

```typescript
fireNovaBlast(caster, players, currentTick): NovaBlastResult | null {
  if (!this.canFire(caster, currentTick)) return null;
  // Record cooldown
  // Find players within ABILITIES.NOVA_BLAST.RADIUS
  return { casterId, casterPosition, hitPlayerIds, damage };
}
```

### ArcaneRaySystem

Instant hitscan ability.

**Logic:**
1. Check cooldown
2. Record ability usage
3. Cast ray from eye level in look direction
4. Find closest hit player using ray-cylinder intersection
5. Return origin, endpoint, and hit player (if any)

**Ray-Cylinder Intersection:**
- Solve quadratic for XZ plane intersection
- Check if hit Y is within cylinder height bounds
- Also check cylinder cap intersections

```typescript
fireArcaneRay(caster, players, currentTick): ArcaneRayResult | null {
  const origin = caster.position + eye offset;
  const direction = getDirectionFromLook(caster.yaw, caster.pitch);
  const hitResult = this.findClosestHit(origin, direction, caster.id, players);
  return { origin, endpoint, hitPlayerId, damage };
}
```

### HealthRegenSystem

Passive health regeneration.

**Logic:**
- Wait `HEALTH_REGEN.DELAY_MS` (8s) after last damage
- Regenerate `HEALTH_REGEN.RATE_PER_SECOND` (5) HP per second
- Cap at `maxHealth`

```typescript
update(players, currentTick, deltaSeconds): void {
  for (const player of players.values()) {
    if (!player.isAlive) continue;
    if (player.health >= player.maxHealth) continue;
    if (currentTick - player.lastDamageTick < this.delayTicks) continue;

    player.health = Math.min(
      player.health + RATE_PER_SECOND * deltaSeconds,
      player.maxHealth
    );
  }
}
```

## Game Phases

### Phase State Machine

```
waiting_for_players <---> countdown <---> playing
        ^                                    |
        |____________________________________|
              (room empty -> full reset)
```

### Phase: waiting_for_players
- Players can join and see each other
- No game logic runs (inputs ignored)
- When `connectedPlayers.size >= MIN_PLAYERS_TO_START`, transition to countdown

### Phase: countdown
- 5-second countdown before game starts
- Broadcasts `COUNTDOWN_UPDATE` every second
- If player count drops below minimum, return to waiting
- After countdown, transition to playing

### Phase: playing
- Full game loop runs
- When winner declared (last player standing), broadcast `GAME_OVER`
- Start new countdown for next game

## Network (ConnectionManager.ts)

Handles WebSocket connection lifecycle:

```typescript
handleConnection(ws: WebSocket): void {
  ws.on('message', (data) => this.handleMessage(ws, message));
  ws.on('close', () => this.handleDisconnect(ws));
}

handleMessage(ws, message): void {
  switch (message.type) {
    case 'join_game':
      // Generate player ID, add to game
      // Send welcome message
      break;
    case 'input':
      // Forward to GameRoom
      break;
    case 'ping':
      // Send pong with timestamps
      break;
  }
}
```

## Testing

Tests are in `__tests__/systems/`. Each system has comprehensive unit tests.

**Running tests:**
```bash
npm run test:server
# or
npx jest --config jest.config.js
```

**Test patterns:**
- Mock player/projectile state with helper functions
- Test each method in isolation
- Test edge cases (cooldowns, boundaries, etc.)
- Test integration between systems where needed

Example test structure:
```typescript
describe('NovaBlastSystem', () => {
  let system: NovaBlastSystem;

  beforeEach(() => {
    system = new NovaBlastSystem();
  });

  it('should hit players within radius', () => {
    const caster = createMockPlayer('caster');
    const victim = createMockPlayer('victim');
    victim.position = { x: 3, y: 0, z: 0 }; // Within radius of 5

    const result = system.fireNovaBlast(caster, players, 0);

    expect(result?.hitPlayerIds).toContain('victim');
  });
});
```

## Adding a New System

1. Create system class in `systems/`:
```typescript
export class MySystem {
  myMethod(players: Map<PlayerId, PlayerState>, ...): void {
    // Implementation
  }
}
```

2. Import and instantiate in `GameRoom`:
```typescript
private mySystem = new MySystem();
```

3. Call in appropriate place in `tick()` or `applyInput()`

4. Write tests in `__tests__/systems/MySystem.test.ts`
