import type { Vec2, AABB } from './types';

/** Wrap an angle to the range (-π, π]. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Rotate `current` toward `target` by at most `maxDelta`, taking the short way. */
export function stepAngle(current: number, target: number, maxDelta: number): number {
  const diff = wrapAngle(target - current);
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

/**
 * Circle vs axis-aligned box overlap resolution.
 * Returns the corrected circle centre if overlapping, or null if clear.
 */
export function resolveCircleAabb(pos: Vec2, radius: number, box: AABB): Vec2 | null {
  const cx = Math.max(box.minX, Math.min(pos.x, box.maxX));
  const cy = Math.max(box.minY, Math.min(pos.y, box.maxY));
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return null;

  if (d2 > 1e-12) {
    // Centre outside the box: push out along the contact normal.
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    return { x: pos.x + dx * push, y: pos.y + dy * push };
  }

  // Centre inside the box: push out along the shallowest axis.
  const toLeft = pos.x - box.minX;
  const toRight = box.maxX - pos.x;
  const toTop = pos.y - box.minY;
  const toBottom = box.maxY - pos.y;
  const m = Math.min(toLeft, toRight, toTop, toBottom);
  if (m === toLeft) return { x: box.minX - radius, y: pos.y };
  if (m === toRight) return { x: box.maxX + radius, y: pos.y };
  if (m === toTop) return { x: pos.x, y: box.minY - radius };
  return { x: pos.x, y: box.maxY + radius };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate between two angles taking the short way around. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}
