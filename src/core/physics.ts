import type { AABB } from './types';

/** Circle (centre x,z + radius) vs a list of axis-aligned boxes, in the XZ plane. */
export function circleHitsBoxes(x: number, z: number, radius: number, obstacles: AABB[]): boolean {
  const r2 = radius * radius;
  for (const b of obstacles) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}

/** Point-in-box test in the XZ plane (used for shell hits). */
export function aabbContainsPoint(b: AABB, x: number, z: number): boolean {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

/** A 3x3 axis-aligned box centred on a tank at (x,z). */
export function tankAabb(x: number, z: number): AABB {
  return { minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.5, maxZ: z + 1.5 };
}

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
