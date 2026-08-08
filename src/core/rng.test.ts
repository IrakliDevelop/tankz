import { describe, expect, it } from 'vitest';
import { randomUnit, shuffledIndices } from './rng';

describe('seeded rng', () => {
  it('repeats the same sequence from the same state', () => {
    const a = { rngState: 1234 };
    const b = { rngState: 1234 };
    expect([randomUnit(a), randomUnit(a), randomUnit(a)]).toEqual([
      randomUnit(b),
      randomUnit(b),
      randomUnit(b),
    ]);
  });

  it('produces a complete deterministic shuffle', () => {
    const source = { rngState: 99 };
    const shuffled = shuffledIndices(source, 6);
    expect([...shuffled].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(shuffled).toEqual(shuffledIndices({ rngState: 99 }, 6));
  });
});
