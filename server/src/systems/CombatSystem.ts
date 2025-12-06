import { PlayerState, PlayerId } from '@wizard-zone/shared';
import { CollisionResult } from './CollisionSystem.js';

export interface DeathEvent {
  victimId: PlayerId;
  killerId: PlayerId;
}

export class CombatSystem {
  /**
   * Apply damage from collision results
   * Returns list of players who died
   */
  applyDamage(
    players: Map<PlayerId, PlayerState>,
    hits: CollisionResult[]
  ): DeathEvent[] {
    const deaths: DeathEvent[] = [];

    for (const hit of hits) {
      const player = players.get(hit.playerId);
      if (!player || !player.isAlive) continue;

      player.health -= hit.damage;

      if (player.health <= 0) {
        player.health = 0;
        player.isAlive = false;

        // Find the projectile owner
        deaths.push({
          victimId: hit.playerId,
          killerId: hit.playerId, // Will be set properly below
        });
      }
    }

    // Set killer IDs from the hits
    for (let i = 0; i < deaths.length; i++) {
      const death = deaths[i];
      if (death) {
        const hit = hits.find((h) => h.playerId === death.victimId);
        if (hit) {
          death.killerId = hit.ownerId;
        }
      }
    }

    return deaths;
  }

  /**
   * Apply damage and track killer
   */
  applyHit(
    players: Map<PlayerId, PlayerState>,
    victimId: PlayerId,
    killerId: PlayerId,
    damage: number
  ): DeathEvent | null {
    const victim = players.get(victimId);
    if (!victim || !victim.isAlive) return null;

    victim.health -= damage;

    if (victim.health <= 0) {
      victim.health = 0;
      victim.isAlive = false;

      const killer = players.get(killerId);
      console.log(
        `[CombatSystem] ${victim.name} was eliminated by ${killer?.name ?? 'unknown'}`
      );

      return {
        victimId,
        killerId,
      };
    }

    return null;
  }

  /**
   * Check for win condition (last player standing)
   */
  checkWinCondition(players: Map<PlayerId, PlayerState>): PlayerId | null {
    const alivePlayers = Array.from(players.values()).filter((p) => p.isAlive);

    if (alivePlayers.length === 1 && alivePlayers[0]) {
      return alivePlayers[0].id;
    }

    return null;
  }

  /**
   * Get count of alive players
   */
  getAliveCount(players: Map<PlayerId, PlayerState>): number {
    return Array.from(players.values()).filter((p) => p.isAlive).length;
  }
}
