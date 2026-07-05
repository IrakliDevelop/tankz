import { describe, it, expect } from 'vitest';
import { circleHitsBoxes, aabbContainsPoint, tankAabb, wrapAngle, stepAngle } from './physics';
import type { AABB } from './types';

const box: AABB = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

describe('circleHitsBoxes', () => {
  it('detects overlap', () => {
    expect(circleHitsBoxes(1.4, 0, 0.5, [box])).toBe(true); // 0.4 away, r 0.5
  });
  it('misses when far enough', () => {
    expect(circleHitsBoxes(3, 0, 0.5, [box])).toBe(false);
  });
  it('ignores an empty obstacle list', () => {
    expect(circleHitsBoxes(0, 0, 5, [])).toBe(false);
  });
});

describe('aabbContainsPoint', () => {
  it('is true inside, false outside', () => {
    expect(aabbContainsPoint(box, 0, 0)).toBe(true);
    expect(aabbContainsPoint(box, 2, 0)).toBe(false);
  });
});

describe('tankAabb', () => {
  it('centres a 3x3 box on (x,z)', () => {
    expect(tankAabb(10, -4)).toEqual({ minX: 8.5, maxX: 11.5, minZ: -5.5, maxZ: -2.5 });
  });
});

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
