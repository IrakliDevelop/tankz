import type { EntityId, Team, Vec2 } from './types';
import type { Arena } from './arena';
import { isSolidAtPoint } from './arena';
import { SHELL } from './config';

export interface Shell {
  id: EntityId;
  pos: Vec2;
  vel: Vec2;
  age: number;
  team: Team;
  ownerId: EntityId;
  damage: number;
}

export function spawnShell(
  id: EntityId,
  muzzle: Vec2,
  angle: number,
  team: Team,
  ownerId: EntityId,
  damage: number,
): Shell {
  return {
    id,
    pos: { x: muzzle.x, y: muzzle.y },
    vel: {
      x: Math.cos(angle) * SHELL.speed,
      y: Math.sin(angle) * SHELL.speed,
    },
    age: 0,
    team,
    ownerId,
    damage,
  };
}

/** Advance all shells one step and report wall impacts for visual effects. */
export function stepShells(shells: Shell[], arena: Arena, dt: number): Vec2[] {
  const wallHits: Vec2[] = [];
  for (let i = shells.length - 1; i >= 0; i--) {
    const shell = shells[i];
    shell.pos.x += shell.vel.x * dt;
    shell.pos.y += shell.vel.y * dt;
    shell.age += dt;
    const hitWall = isSolidAtPoint(arena, shell.pos);
    if (shell.age > SHELL.life || hitWall) {
      if (hitWall) wallHits.push({ x: shell.pos.x, y: shell.pos.y });
      shells.splice(i, 1);
    }
  }
  return wallHits;
}
