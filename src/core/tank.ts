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

export function createTank(x: number, y: number): TankState {
  return { pos: { x, y }, speed: 0, hullAngle: 0, turretAngle: 0 };
}

/** Advance the tank one sim step. Mutates `tank`. */
export function stepTank(tank: TankState, intent: InputIntent, arena: Arena, dt: number): void {
  // Hull rotation.
  tank.hullAngle = wrapAngle(tank.hullAngle + intent.steer * TANK.hullTurnRate * dt);

  // Throttle / friction: speed lives along the hull heading, so turning
  // carries the velocity with it — the "driving a vehicle" feel.
  if (intent.throttle !== 0) {
    tank.speed += intent.throttle * TANK.accel * dt;
  } else {
    tank.speed *= Math.exp(-TANK.friction * dt);
    if (Math.abs(tank.speed) < 1) tank.speed = 0;
  }
  tank.speed = Math.max(-TANK.maxReverseSpeed, Math.min(tank.speed, TANK.maxSpeed));

  // Integrate position.
  tank.pos.x += Math.cos(tank.hullAngle) * tank.speed * dt;
  tank.pos.y += Math.sin(tank.hullAngle) * tank.speed * dt;

  // Push out of any solid tile nearby. Sequential resolution over the 3×3
  // neighborhood is enough at demo speeds; speed is kept so walls slide.
  for (const box of solidAabbsNear(arena, tank.pos)) {
    const pushed = resolveCircleAabb(tank.pos, TANK.radius, box);
    if (pushed) {
      tank.pos.x = pushed.x;
      tank.pos.y = pushed.y;
    }
  }

  // Turret tracks the aim point at a capped rate (no instant snap).
  const target = Math.atan2(intent.aimPoint.y - tank.pos.y, intent.aimPoint.x - tank.pos.x);
  tank.turretAngle = stepAngle(tank.turretAngle, target, TANK.turretTurnRate * dt);
}
