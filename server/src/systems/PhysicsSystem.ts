import { PlayerState, PHYSICS } from '@wizard-zone/shared';

export class PhysicsSystem {
  update(players: Map<string, PlayerState>, deltaSeconds: number): void {
    for (const player of players.values()) {
      if (!player.isAlive) continue;
      this.updatePlayer(player, deltaSeconds);
    }
  }

  private updatePlayer(player: PlayerState, dt: number): void {
    // Apply gravity if not grounded
    if (!player.isGrounded) {
      player.velocity.y += PHYSICS.GRAVITY * dt;
    }

    // Integrate position
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;
    player.position.z += player.velocity.z * dt;

    // Ground collision (simple floor at y=0)
    const playerBottomY = player.position.y - PHYSICS.PLAYER_HEIGHT / 2;
    if (playerBottomY <= PHYSICS.GROUND_LEVEL) {
      player.position.y = PHYSICS.GROUND_LEVEL + PHYSICS.PLAYER_HEIGHT / 2;
      player.velocity.y = 0;
      player.isGrounded = true;
    } else {
      // Check if player just walked off an edge
      player.isGrounded = false;
    }

    // Apply horizontal friction when grounded
    if (player.isGrounded) {
      player.velocity.x *= PHYSICS.GROUND_FRICTION;
      player.velocity.z *= PHYSICS.GROUND_FRICTION;
    }

    // Clamp to arena bounds
    const halfArena = 29; // 60/2 - 1 for wall thickness
    player.position.x = Math.max(-halfArena, Math.min(halfArena, player.position.x));
    player.position.z = Math.max(-halfArena, Math.min(halfArena, player.position.z));

    // Prevent falling through the world
    if (player.position.y < 0) {
      player.position.y = PHYSICS.PLAYER_HEIGHT / 2;
      player.velocity.y = 0;
      player.isGrounded = true;
    }
  }

  applyMovementInput(
    player: PlayerState,
    forward: boolean,
    backward: boolean,
    left: boolean,
    right: boolean,
    yaw: number
  ): void {
    // Calculate local movement direction based on input
    // In Three.js, camera looks down -Z, so forward = -Z, right = +X
    let localX = 0;
    let localZ = 0;

    if (forward) localZ = -1;  // Forward is -Z in camera space
    if (backward) localZ = 1;  // Backward is +Z
    if (left) localX = -1;     // Left is -X
    if (right) localX = 1;     // Right is +X

    // Normalize if moving diagonally
    const length = Math.sqrt(localX * localX + localZ * localZ);
    if (length > 0) {
      localX /= length;
      localZ /= length;
    }

    // Rotate local movement by yaw to get world movement
    // Yaw rotates around Y axis: positive yaw = rotate left (counter-clockwise from above)
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    // Standard 2D rotation matrix applied to XZ plane
    const worldX = localX * cosYaw + localZ * sinYaw;
    const worldZ = -localX * sinYaw + localZ * cosYaw;

    // Apply movement speed with air control factor
    const control = player.isGrounded ? 1.0 : PHYSICS.AIR_CONTROL;
    const speed = PHYSICS.PLAYER_SPEED * control;

    player.velocity.x = worldX * speed;
    player.velocity.z = worldZ * speed;
  }

  applyJump(player: PlayerState): boolean {
    if (player.isGrounded) {
      player.velocity.y = PHYSICS.JUMP_VELOCITY;
      player.isGrounded = false;
      return true;
    }
    return false;
  }
}
