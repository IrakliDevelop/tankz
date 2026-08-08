import { describe, expect, it } from 'vitest';
import {
  ARENA_TEMPLATES,
  arenaTemplateForWave,
  isSolid,
  isSolidAtPoint,
  parseArena,
  solidAabbsNear,
  tileAabb,
  tileAt,
} from './arena';
import { ARENA_PROGRESSION, TILE_SIZE } from './config';
import type { Vec2 } from './types';

const tiny = parseArena(['####', '#.o#', '####']);

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
      minX: 2 * TILE_SIZE,
      maxX: 3 * TILE_SIZE,
      minY: 1 * TILE_SIZE,
      maxY: 2 * TILE_SIZE,
    });
  });
});

describe('solidAabbsNear', () => {
  it('returns the solid boxes in the 3x3 neighborhood', () => {
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

describe('arena templates', () => {
  it('are rectangular, fully walled, and keep every spawn on floor', () => {
    for (const template of ARENA_TEMPLATES) {
      const arena = parseArena(template.layout);
      for (let col = 0; col < arena.cols; col++) {
        expect(tileAt(arena, col, 0)).toBe('wall');
        expect(tileAt(arena, col, arena.rows - 1)).toBe('wall');
      }
      for (let row = 0; row < arena.rows; row++) {
        expect(tileAt(arena, 0, row)).toBe('wall');
        expect(tileAt(arena, arena.cols - 1, row)).toBe('wall');
      }
      expect(kindAtWorld(arena, template.playerSpawn)).toBe('floor');
      for (const spawn of template.enemySpawns) {
        expect(kindAtWorld(arena, spawn)).toBe('floor');
      }
    }
  });

  it('grows at waves 3 and 5 without shrinking either dimension', () => {
    const dimensions = ARENA_TEMPLATES.map((template) => {
      const arena = parseArena(template.layout);
      return { cols: arena.cols, rows: arena.rows };
    });
    expect(dimensions).toEqual([
      { cols: 24, rows: 16 },
      { cols: 32, rows: 20 },
      { cols: 40, rows: 24 },
    ]);
    expect(arenaTemplateForWave(1).id).toBe('salvageYard');
    expect(arenaTemplateForWave(ARENA_PROGRESSION.mediumStartsAt).id).toBe('freightDepot');
    expect(arenaTemplateForWave(ARENA_PROGRESSION.largeStartsAt).id).toBe('ironFoundry');
  });
});

function kindAtWorld(arena: ReturnType<typeof parseArena>, pos: Vec2) {
  return tileAt(arena, Math.floor(pos.x / TILE_SIZE), Math.floor(pos.y / TILE_SIZE));
}
