import { describe, expect, it } from 'vitest';
import { takeId, type IdSource } from './ids';

describe('takeId', () => {
  it('returns strictly increasing unique ids', () => {
    const source: IdSource = { nextEntityId: 1 };
    const ids = [takeId(source), takeId(source), takeId(source)];
    expect(ids).toEqual([1, 2, 3]);
    expect(new Set(ids).size).toBe(3);
    expect(source.nextEntityId).toBe(4);
  });

  it('is deterministic and isolated per simulation state', () => {
    const a: IdSource = { nextEntityId: 7 };
    const b: IdSource = { nextEntityId: 7 };
    expect([takeId(a), takeId(a)]).toEqual([takeId(b), takeId(b)]);
  });
});
