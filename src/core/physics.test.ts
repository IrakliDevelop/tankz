import { describe, it, expect } from 'vitest';
import { wrapAngle, stepAngle, resolveCircleAabb, lerp, lerpAngle } from './physics';
import type { AABB } from './types';

describe('wrapAngle', () => {
  it('wraps into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI * 0.5);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI * 0.5);
  });
});

describe('stepAngle', () => {
  it('clamps to maxDelta and takes the short way', () => {
    expect(stepAngle(0, 1, 0.25)).toBeCloseTo(0.25);
    // target just past +PI is reached the short way (negative direction)
    expect(stepAngle(0, Math.PI * 0.9, 10)).toBeCloseTo(Math.PI * 0.9);
  });
  it('snaps to target when within maxDelta', () => {
    expect(stepAngle(0, 0.1, 0.25)).toBeCloseTo(0.1);
  });
});

describe('resolveCircleAabb', () => {
  const box: AABB = { minX: 0, maxX: 32, minY: 0, maxY: 32 };

  it('returns null when not overlapping', () => {
    expect(resolveCircleAabb({ x: 50, y: 16 }, 10, box)).toBeNull();
  });

  it('pushes a circle out along the contact normal (side hit)', () => {
    // Circle centre 6px right of the box's right edge, radius 10 → 4px overlap.
    const pushed = resolveCircleAabb({ x: 38, y: 16 }, 10, box);
    expect(pushed).not.toBeNull();
    expect(pushed!.x).toBeCloseTo(42); // maxX (32) + radius (10)
    expect(pushed!.y).toBeCloseTo(16); // unchanged
  });

  it('pushes out diagonally at a corner', () => {
    // Overlapping the top-right corner from outside.
    const pushed = resolveCircleAabb({ x: 38, y: -6 }, 10, box)!;
    const dx = pushed.x - 32, dy = pushed.y - 0;
    expect(Math.hypot(dx, dy)).toBeCloseTo(10); // sits exactly on the corner at distance r
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeLessThan(0);
  });

  it('pushes out along the shallowest axis when the centre is inside', () => {
    // Centre inside, nearest to the right edge.
    const pushed = resolveCircleAabb({ x: 30, y: 16 }, 10, box)!;
    expect(pushed.x).toBeCloseTo(42); // maxX + radius
    expect(pushed.y).toBeCloseTo(16);
  });
});

describe('lerp / lerpAngle', () => {
  it('lerp interpolates linearly', () => {
    expect(lerp(0, 10, 0.25)).toBeCloseTo(2.5);
  });
  it('lerpAngle takes the short way across the wrap boundary', () => {
    // From just below +π to just above -π: short way crosses π, not zero.
    const mid = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
    expect(Math.abs(wrapAngle(mid))).toBeCloseTo(Math.PI, 1);
  });
});
