import { describe, it, expect } from 'vitest';
import { nextId, resetIds } from './ids';

describe('ids', () => {
  it('returns strictly increasing unique ids', () => {
    resetIds();
    const a = nextId(), b = nextId(), c = nextId();
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('resetIds() restarts the counter', () => {
    resetIds();
    expect(nextId()).toBe(1);
  });
});
