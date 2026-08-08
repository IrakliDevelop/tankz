import type { AABB, Vec2 } from './types';
import { ARENA_PROGRESSION, TILE_SIZE } from './config';

export type TileKind = 'floor' | 'wall' | 'obstacle';
export type ArenaId = 'salvageYard' | 'freightDepot' | 'ironFoundry';

/** Row-major tile grid. Index = row * cols + col. */
export interface Arena {
  cols: number;
  rows: number;
  tiles: TileKind[];
}

export interface ArenaTemplate {
  id: ArenaId;
  name: string;
  minWave: number;
  layout: readonly string[];
  playerSpawn: Vec2;
  enemySpawns: readonly Vec2[];
}

interface ObstacleRect {
  col: number;
  row: number;
  width: number;
  height: number;
}

const CHAR_TO_TILE: Record<string, TileKind> = {
  '#': 'wall',
  o: 'obstacle',
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

export function tileCenter(col: number, row: number): Vec2 {
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}

const SALVAGE_YARD: ArenaTemplate = {
  id: 'salvageYard',
  name: 'Salvage Yard',
  minWave: 1,
  layout: buildLayout(24, 16, [
    { col: 3, row: 2, width: 2, height: 2 },
    { col: 14, row: 2, width: 1, height: 3 },
    { col: 10, row: 6, width: 2, height: 2 },
    { col: 20, row: 7, width: 1, height: 1 },
    { col: 21, row: 8, width: 1, height: 1 },
    { col: 4, row: 10, width: 1, height: 3 },
    { col: 10, row: 11, width: 3, height: 1 },
  ]),
  playerSpawn: tileCenter(1, 1),
  enemySpawns: [
    tileCenter(22, 1),
    tileCenter(22, 14),
    tileCenter(1, 14),
    tileCenter(12, 14),
    tileCenter(21, 5),
    tileCenter(7, 8),
    tileCenter(14, 9),
  ],
};

const FREIGHT_DEPOT: ArenaTemplate = {
  id: 'freightDepot',
  name: 'Freight Depot',
  minWave: ARENA_PROGRESSION.mediumStartsAt,
  layout: buildLayout(32, 20, [
    { col: 5, row: 3, width: 3, height: 2 },
    { col: 15, row: 2, width: 2, height: 4 },
    { col: 24, row: 3, width: 2, height: 3 },
    { col: 10, row: 8, width: 3, height: 2 },
    { col: 20, row: 8, width: 3, height: 2 },
    { col: 6, row: 13, width: 2, height: 3 },
    { col: 15, row: 13, width: 3, height: 2 },
    { col: 25, row: 13, width: 2, height: 3 },
  ]),
  playerSpawn: tileCenter(2, 2),
  enemySpawns: [
    tileCenter(29, 2),
    tileCenter(29, 17),
    tileCenter(2, 17),
    tileCenter(16, 17),
    tileCenter(28, 9),
    tileCenter(12, 4),
    tileCenter(10, 15),
  ],
};

const IRON_FOUNDRY: ArenaTemplate = {
  id: 'ironFoundry',
  name: 'Iron Foundry',
  minWave: ARENA_PROGRESSION.largeStartsAt,
  layout: buildLayout(40, 24, [
    { col: 6, row: 3, width: 3, height: 3 },
    { col: 18, row: 3, width: 4, height: 2 },
    { col: 30, row: 3, width: 3, height: 3 },
    { col: 12, row: 9, width: 3, height: 3 },
    { col: 24, row: 8, width: 3, height: 4 },
    { col: 34, row: 10, width: 2, height: 3 },
    { col: 5, row: 16, width: 3, height: 3 },
    { col: 17, row: 16, width: 4, height: 3 },
    { col: 29, row: 16, width: 3, height: 3 },
  ]),
  playerSpawn: tileCenter(2, 2),
  enemySpawns: [
    tileCenter(37, 2),
    tileCenter(37, 21),
    tileCenter(2, 21),
    tileCenter(20, 21),
    tileCenter(37, 11),
    tileCenter(20, 7),
    tileCenter(10, 20),
    tileCenter(28, 20),
  ],
};

export const ARENA_TEMPLATES: readonly ArenaTemplate[] = [
  SALVAGE_YARD,
  FREIGHT_DEPOT,
  IRON_FOUNDRY,
];

export const DEFAULT_ARENA_TEMPLATE = SALVAGE_YARD;

/** Kept as the compact-room layout alias for existing imports and tests. */
export const DEMO_LAYOUT = SALVAGE_YARD.layout;

export function arenaTemplateForWave(wave: number): ArenaTemplate {
  if (wave >= IRON_FOUNDRY.minWave) return IRON_FOUNDRY;
  if (wave >= FREIGHT_DEPOT.minWave) return FREIGHT_DEPOT;
  return SALVAGE_YARD;
}

function buildLayout(
  cols: number,
  rows: number,
  obstacles: readonly ObstacleRect[],
): readonly string[] {
  const grid: string[][] = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      row === 0 || col === 0 || row === rows - 1 || col === cols - 1 ? '#' : '.',
    ),
  );
  for (const obstacle of obstacles) {
    for (let row = obstacle.row; row < obstacle.row + obstacle.height; row++) {
      for (let col = obstacle.col; col < obstacle.col + obstacle.width; col++) {
        grid[row][col] = 'o';
      }
    }
  }
  return grid.map((row) => row.join(''));
}
