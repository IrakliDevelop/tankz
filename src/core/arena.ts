import type { AABB, Vec2 } from './types';
import { TILE_SIZE } from './config';

export type TileKind = 'floor' | 'wall' | 'obstacle';

/** Row-major tile grid. Index = row * cols + col. */
export interface Arena {
  cols: number;
  rows: number;
  tiles: TileKind[];
}

const CHAR_TO_TILE: Record<string, TileKind> = {
  '#': 'wall',
  'o': 'obstacle',
  '.': 'floor',
};

export function parseArena(layout: readonly string[]): Arena {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const tiles: TileKind[] = [];
  for (const line of layout) {
    if (line.length !== cols) {
      throw new Error(`ragged arena layout: expected ${cols} cols, got ${line.length}`);
    }
    for (const ch of line) {
      const kind = CHAR_TO_TILE[ch];
      if (!kind) throw new Error(`unknown arena tile character: "${ch}"`);
      tiles.push(kind);
    }
  }
  return { cols, rows, tiles };
}

export function isSolid(kind: TileKind): boolean {
  return kind !== 'floor';
}

/** Tile kind at (col, row); everything outside the grid counts as wall. */
export function tileAt(arena: Arena, col: number, row: number): TileKind {
  if (col < 0 || row < 0 || col >= arena.cols || row >= arena.rows) return 'wall';
  return arena.tiles[row * arena.cols + col];
}

export function tileAabb(col: number, row: number): AABB {
  return {
    minX: col * TILE_SIZE,
    maxX: (col + 1) * TILE_SIZE,
    minY: row * TILE_SIZE,
    maxY: (row + 1) * TILE_SIZE,
  };
}

/** Solid tile boxes in the 3×3 neighborhood around a world position. */
export function solidAabbsNear(arena: Arena, pos: Vec2): AABB[] {
  const col = Math.floor(pos.x / TILE_SIZE);
  const row = Math.floor(pos.y / TILE_SIZE);
  const out: AABB[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (isSolid(tileAt(arena, c, r))) out.push(tileAabb(c, r));
    }
  }
  return out;
}

/** Is this world-pixel point inside a solid tile? (Shell-vs-wall test.) */
export function isSolidAtPoint(arena: Arena, p: Vec2): boolean {
  return isSolid(tileAt(arena, Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE)));
}

/** Hand-authored demo arena. '#' wall, 'o' obstacle (interior cover), '.' floor. */
export const DEMO_LAYOUT: readonly string[] = [
  '########################',
  '#......................#',
  '#..oo..........o.......#',
  '#..oo..........o.......#',
  '#..............o.......#',
  '#......................#',
  '#.........oo...........#',
  '#.........oo........o..#',
  '#....................o.#',
  '#......................#',
  '#...o..................#',
  '#...o.....ooo..........#',
  '#...o..................#',
  '#......................#',
  '#......................#',
  '########################',
];
