import { describe, it, expect } from 'vitest';
import { wrapAngle, stepAngle } from './physics';

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
