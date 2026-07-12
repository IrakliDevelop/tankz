import type { EntityId, Vec2 } from './types';
import type { Arena } from './arena';
import { isSolidAtPoint } from './arena';
import { nextId } from './ids';
import { SHELL } from './config';

export interface Shell {
  id: EntityId;
  pos: Vec2;
  vel: Vec2;
  age: number;
}

export function spawnShell(muzzle: Vec2, angle: number): Shell {
  return {
    id: nextId(),
    pos: { x: muzzle.x, y: muzzle.y },
    vel: { x: Math.cos(angle) * SHELL.speed, y: Math.sin(angle) * SHELL.speed },
    age: 0,
  };
}

/** Advance all shells one step; removes any that hit a wall or expire. */
export function stepShells(shells: Shell[], arena: Arena, dt: number): void {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    s.pos.x += s.vel.x * dt;
    s.pos.y += s.vel.y * dt;
    s.age += dt;
    if (s.age > SHELL.life || isSolidAtPoint(arena, s.pos)) {
      shells.splice(i, 1);
    }
  }
}
