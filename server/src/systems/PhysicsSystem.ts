import { PlayerState, PHYSICS, ABILITIES } from '@wizard-zone/shared';

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

  /**
   * Apply dash ability - burst of speed in movement direction
   */
  applyDash(player: PlayerState, yaw: number, currentTick: number): boolean {
    // Check cooldown
    const cooldownTicks = Math.ceil(ABILITIES.DASH.COOLDOWN_MS / (1000 / 60));
    const ticksSinceLastUse = currentTick - player.abilities.dash.lastUsed;

    if (ticksSinceLastUse < cooldownTicks && player.abilities.dash.lastUsed !== 0) {
      return false;
    }

    // Calculate dash direction based on current velocity or facing direction
    let dashDirX: number;
    let dashDirZ: number;

    const velMagnitude = Math.sqrt(
      player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z
    );

    if (velMagnitude > 0.1) {
      // Dash in movement direction
      dashDirX = player.velocity.x / velMagnitude;
      dashDirZ = player.velocity.z / velMagnitude;
    } else {
      // Dash in facing direction
      dashDirX = -Math.sin(yaw);
      dashDirZ = -Math.cos(yaw);
    }

    // Apply dash velocity (instant burst)
    const dashSpeed = ABILITIES.DASH.DISTANCE / (ABILITIES.DASH.DURATION_MS / 1000);
    player.velocity.x = dashDirX * dashSpeed;
    player.velocity.z = dashDirZ * dashSpeed;

    // Record cooldown
    player.abilities.dash.lastUsed = currentTick;
    player.abilities.dash.ready = false;
    player.abilities.dash.cooldownRemaining = ABILITIES.DASH.COOLDOWN_MS;

    return true;
  }

  /**
   * Apply launch jump ability - high vertical jump with forward boost
   */
  applyLaunchJump(player: PlayerState, yaw: number, currentTick: number): boolean {
    // Check cooldown
    const cooldownTicks = Math.ceil(ABILITIES.LAUNCH_JUMP.COOLDOWN_MS / (1000 / 60));
    const ticksSinceLastUse = currentTick - player.abilities.launchJump.lastUsed;

    if (ticksSinceLastUse < cooldownTicks && player.abilities.launchJump.lastUsed !== 0) {
      return false;
    }

    // Must be grounded to launch jump
    if (!player.isGrounded) {
      return false;
    }

    // Apply vertical velocity
    player.velocity.y = ABILITIES.LAUNCH_JUMP.VERTICAL_VELOCITY;

    // Apply horizontal boost in facing direction
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    player.velocity.x += forwardX * ABILITIES.LAUNCH_JUMP.HORIZONTAL_BOOST;
    player.velocity.z += forwardZ * ABILITIES.LAUNCH_JUMP.HORIZONTAL_BOOST;

    player.isGrounded = false;

    // Record cooldown
    player.abilities.launchJump.lastUsed = currentTick;
    player.abilities.launchJump.ready = false;
    player.abilities.launchJump.cooldownRemaining = ABILITIES.LAUNCH_JUMP.COOLDOWN_MS;

    return true;
  }

  /**
   * Update ability cooldowns for all players
   */
  updateAbilityCooldowns(players: Map<string, PlayerState>, currentTick: number): void {
    const dashCooldownTicks = Math.ceil(ABILITIES.DASH.COOLDOWN_MS / (1000 / 60));
    const launchCooldownTicks = Math.ceil(ABILITIES.LAUNCH_JUMP.COOLDOWN_MS / (1000 / 60));

    for (const player of players.values()) {
      // Update dash cooldown
      const dashTicksSince = currentTick - player.abilities.dash.lastUsed;
      if (dashTicksSince >= dashCooldownTicks) {
        player.abilities.dash.ready = true;
        player.abilities.dash.cooldownRemaining = 0;
      } else {
        player.abilities.dash.ready = false;
        const remainingTicks = dashCooldownTicks - dashTicksSince;
        player.abilities.dash.cooldownRemaining = remainingTicks * (1000 / 60);
      }

      // Update launch jump cooldown
      const launchTicksSince = currentTick - player.abilities.launchJump.lastUsed;
      if (launchTicksSince >= launchCooldownTicks) {
        player.abilities.launchJump.ready = true;
        player.abilities.launchJump.cooldownRemaining = 0;
      } else {
        player.abilities.launchJump.ready = false;
        const remainingTicks = launchCooldownTicks - launchTicksSince;
        player.abilities.launchJump.cooldownRemaining = remainingTicks * (1000 / 60);
      }
    }
  }
}
