import type { Vec3 } from './vectors.js';
import type { PlayerId } from './player.js';

export type ProjectileId = string;

export enum ProjectileType {
  FIREBALL = 'fireball',
}

export interface ProjectileState {
  id: ProjectileId;
  type: ProjectileType;
  ownerId: PlayerId;
  position: Vec3;
  velocity: Vec3;
  createdAt: number;
  lifetime: number;
  damage: number;
  radius: number;
}
