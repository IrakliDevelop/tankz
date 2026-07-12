import { describe, it, expect } from 'vitest';
import {
  parseArena, isSolid, tileAt, tileAabb, solidAabbsNear, isSolidAtPoint, DEMO_LAYOUT,
} from './arena';
import { TILE_SIZE } from './config';

const tiny = parseArena([
  '####',
  '#.o#',
  '####',
]);

describe('parseArena', () => {
  it('parses dimensions and kinds', () => {
    expect(tiny.cols).toBe(4);
    expect(tiny.rows).toBe(3);
    expect(tileAt(tiny, 0, 0)).toBe('wall');
    expect(tileAt(tiny, 1, 1)).toBe('floor');
    expect(tileAt(tiny, 2, 1)).toBe('obstacle');
  });

  it('throws on ragged rows', () => {
    expect(() => parseArena(['##', '#'])).toThrow(/ragged/);
  });

  it('throws on unknown characters', () => {
    expect(() => parseArena(['#?'])).toThrow(/unknown/);
  });
});

describe('tileAt out of bounds', () => {
  it('treats everything outside the grid as wall', () => {
    expect(tileAt(tiny, -1, 0)).toBe('wall');
    expect(tileAt(tiny, 0, -1)).toBe('wall');
    expect(tileAt(tiny, 4, 0)).toBe('wall');
    expect(tileAt(tiny, 0, 3)).toBe('wall');
  });
});

describe('isSolid', () => {
  it('walls and obstacles are solid, floor is not', () => {
    expect(isSolid('wall')).toBe(true);
    expect(isSolid('obstacle')).toBe(true);
    expect(isSolid('floor')).toBe(false);
  });
});

describe('tileAabb', () => {
  it('is the world-pixel box of the tile', () => {
    expect(tileAabb(2, 1)).toEqual({
      minX: 2 * TILE_SIZE, maxX: 3 * TILE_SIZE,
      minY: 1 * TILE_SIZE, maxY: 2 * TILE_SIZE,
    });
  });
});

describe('solidAabbsNear', () => {
  it('returns the solid boxes in the 3x3 neighborhood', () => {
    // Centre of the only floor tile (1,1): neighbors are 8 solid tiles.
    const boxes = solidAabbsNear(tiny, { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 });
    expect(boxes).toHaveLength(8);
  });

  it('returns no boxes in open floor', () => {
    const open = parseArena(['.....', '.....', '.....', '.....', '.....']);
    expect(solidAabbsNear(open, { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 })).toHaveLength(0);
  });
});

describe('isSolidAtPoint', () => {
  it('is true inside a wall tile and false on floor', () => {
    expect(isSolidAtPoint(tiny, { x: TILE_SIZE * 0.5, y: TILE_SIZE * 0.5 })).toBe(true);
    expect(isSolidAtPoint(tiny, { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 })).toBe(false);
  });
});

describe('DEMO_LAYOUT', () => {
  it('parses, is fully walled, and has floor at the spawn tile', () => {
    const arena = parseArena(DEMO_LAYOUT);
    expect(arena.cols).toBeGreaterThanOrEqual(20);
    expect(arena.rows).toBeGreaterThanOrEqual(12);
    for (let c = 0; c < arena.cols; c++) {
      expect(tileAt(arena, c, 0)).toBe('wall');
      expect(tileAt(arena, c, arena.rows - 1)).toBe('wall');
    }
    for (let r = 0; r < arena.rows; r++) {
      expect(tileAt(arena, 0, r)).toBe('wall');
      expect(tileAt(arena, arena.cols - 1, r)).toBe('wall');
    }
    expect(tileAt(arena, 1, 1)).toBe('floor'); // SPAWN tile
  });
});
