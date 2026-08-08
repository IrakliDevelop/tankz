import type { Vec2 } from './types';
import type { InputIntent } from './input';
import type { Arena } from './arena';
import { solidAabbsNear } from './arena';
import { resolveCircleAabb, stepAngle, wrapAngle } from './physics';
import { TANK } from './config';

export interface TankState {
  pos: Vec2;
  /** Signed speed along the hull heading (px/s). Negative = reversing. */
  speed: number;
  /** Hull heading (radians). 0 = +x, positive = clockwise on screen. */
  hullAngle: number;
  /** Turret heading (radians, world-absolute — independent of the hull). */
  turretAngle: number;
}

export interface TankMovement {
  radius: number;
  accel: number;
  maxSpeed: number;
  maxReverseSpeed: number;
  friction: number;
  hullTurnRate: number;
  turretTurnRate: number;
}

export function createTank(x: number, y: number): TankState {
  return { pos: { x, y }, speed: 0, hullAngle: 0, turretAngle: 0 };
}

export function resolveTankWalls(tank: TankState, arena: Arena, radius: number): void {
  for (const box of solidAabbsNear(arena, tank.pos)) {
    const pushed = resolveCircleAabb(tank.pos, radius, box);
    if (pushed) {
      tank.pos.x = pushed.x;
      tank.pos.y = pushed.y;
    }
  }
}

/** Advance the tank one sim step. Mutates `tank`. */
export function stepTank(
  tank: TankState,
  intent: InputIntent,
  arena: Arena,
  dt: number,
  movement: TankMovement = TANK,
): void {
  tank.hullAngle = wrapAngle(tank.hullAngle + intent.steer * movement.hullTurnRate * dt);

  // Speed stays aligned to the hull so turning carries momentum with the vehicle.
  if (intent.throttle !== 0) {
    tank.speed += intent.throttle * movement.accel * dt;
  } else {
    tank.speed *= Math.exp(-movement.friction * dt);
    if (Math.abs(tank.speed) < 1) tank.speed = 0;
  }
  tank.speed = Math.max(-movement.maxReverseSpeed, Math.min(tank.speed, movement.maxSpeed));

  tank.pos.x += Math.cos(tank.hullAngle) * tank.speed * dt;
  tank.pos.y += Math.sin(tank.hullAngle) * tank.speed * dt;
  resolveTankWalls(tank, arena, movement.radius);

  const target = Math.atan2(intent.aimPoint.y - tank.pos.y, intent.aimPoint.x - tank.pos.x);
  tank.turretAngle = stepAngle(tank.turretAngle, target, movement.turretTurnRate * dt);
}
