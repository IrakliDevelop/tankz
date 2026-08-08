import type { Arena } from './arena';
import { TANK_COLLISION } from './config';
import { resolveTankWalls, type TankState } from './tank';
import type { EntityId } from './types';

export interface TankCollider {
  id: EntityId;
  body: TankState;
  radius: number;
  mass: number;
}

/**
 * Resolve all solid tank contacts in stable id order.
 * Mutates the supplied tank bodies but never reorders the caller's collection.
 */
export function resolveTankCollisions(colliders: readonly TankCollider[], arena: Arena): void {
  const ordered = [...colliders].sort((a, b) => a.id - b.id);
  for (let iteration = 0; iteration < TANK_COLLISION.solverIterations; iteration++) {
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        resolvePair(ordered[i], ordered[j]);
      }
    }
    for (const collider of ordered) {
      resolveTankWalls(collider.body, arena, collider.radius);
    }
  }
}

function resolvePair(a: TankCollider, b: TankCollider): void {
  const dx = b.body.pos.x - a.body.pos.x;
  const dy = b.body.pos.y - a.body.pos.y;
  const minDistance = a.radius + b.radius;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minDistance * minDistance) return;

  let nx: number;
  let ny: number;
  let distance: number;
  if (distanceSq > Number.EPSILON) {
    distance = Math.sqrt(distanceSq);
    nx = dx / distance;
    ny = dy / distance;
  } else {
    distance = 0;
    const horizontal = ((a.id ^ b.id) & 1) === 0;
    nx = horizontal ? 1 : 0;
    ny = horizontal ? 0 : 1;
  }

  const inverseMassA = 1 / a.mass;
  const inverseMassB = 1 / b.mass;
  const inverseMassTotal = inverseMassA + inverseMassB;
  const penetration = minDistance - distance;
  const moveA = (penetration * inverseMassA) / inverseMassTotal;
  const moveB = (penetration * inverseMassB) / inverseMassTotal;
  a.body.pos.x -= nx * moveA;
  a.body.pos.y -= ny * moveA;
  b.body.pos.x += nx * moveB;
  b.body.pos.y += ny * moveB;

  const ahx = Math.cos(a.body.hullAngle);
  const ahy = Math.sin(a.body.hullAngle);
  const bhx = Math.cos(b.body.hullAngle);
  const bhy = Math.sin(b.body.hullAngle);
  const avx = ahx * a.body.speed;
  const avy = ahy * a.body.speed;
  const bvx = bhx * b.body.speed;
  const bvy = bhy * b.body.speed;
  const relativeNormalSpeed = (bvx - avx) * nx + (bvy - avy) * ny;
  if (relativeNormalSpeed >= 0) return;

  const impulse = (-(1 + TANK_COLLISION.restitution) * relativeNormalSpeed) / inverseMassTotal;
  const nextAvx = avx - impulse * inverseMassA * nx;
  const nextAvy = avy - impulse * inverseMassA * ny;
  const nextBvx = bvx + impulse * inverseMassB * nx;
  const nextBvy = bvy + impulse * inverseMassB * ny;
  a.body.speed = nextAvx * ahx + nextAvy * ahy;
  b.body.speed = nextBvx * bhx + nextBvy * bhy;
}
