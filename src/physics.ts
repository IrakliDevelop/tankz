import * as THREE from 'three';
import type { Obstacle } from './types';

/**
 * Tiny shared helpers used by both the player tank and the enemies.
 * Keeping them here means the collision + angle math lives in exactly one
 * place instead of being copy-pasted into each tank type.
 */

/** Circle (centre x,z + radius) vs a list of axis-aligned boxes, in the XZ plane. */
export function circleHitsBoxes(
  x: number, z: number, radius: number, obstacles: Obstacle[]
): boolean {
  const r2 = radius * radius;
  for (const { box } of obstacles) {
    // Closest point on the box to the circle centre, then distance check.
    const cx = Math.max(box.min.x, Math.min(x, box.max.x));
    const cz = Math.max(box.min.z, Math.min(z, box.max.z));
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}

/** An axis-aligned box roughly enclosing a tank sitting at (x,z). */
export function tankBox(x: number, z: number): THREE.Box3 {
  return new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(x, 1.2, z),
    new THREE.Vector3(3, 2.6, 3)
  );
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
