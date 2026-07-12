import { describe, it, expect, beforeEach } from 'vitest';
import { spawnShell, stepShells, type Shell } from './projectile';
import { parseArena } from './arena';
import { SHELL, TILE_SIZE } from './config';
import { resetIds } from './ids';

const arena = parseArena([
  '######',
  '#....#',
  '######',
]);
const midY = TILE_SIZE * 1.5;
const DT = 1 / 60;

beforeEach(resetIds);

describe('spawnShell', () => {
  it('sets velocity from the angle at SHELL.speed', () => {
    const s = spawnShell({ x: 100, y: midY }, 0);
    expect(s.vel.x).toBeCloseTo(SHELL.speed);
    expect(s.vel.y).toBeCloseTo(0);
    expect(s.age).toBe(0);
  });

  it('copies the muzzle position instead of aliasing it', () => {
    const muzzle = { x: 100, y: midY };
    const s = spawnShell(muzzle, 0);
    muzzle.x = 999;
    expect(s.pos.x).toBe(100);
  });
});

describe('stepShells', () => {
  it('moves shells by vel * dt', () => {
    const shells: Shell[] = [spawnShell({ x: TILE_SIZE * 1.5, y: midY }, 0)];
    stepShells(shells, arena, DT);
    expect(shells[0].pos.x).toBeCloseTo(TILE_SIZE * 1.5 + SHELL.speed * DT);
  });

  it('despawns a shell that enters a solid tile', () => {
    const shells: Shell[] = [spawnShell({ x: TILE_SIZE * 4.5, y: midY }, 0)]; // flying at the east wall
    for (let i = 0; i < 30; i++) stepShells(shells, arena, DT);
    expect(shells).toHaveLength(0);
  });

  it('despawns a shell past its lifetime', () => {
    // Aim down the long axis of a huge open arena so it never hits a wall.
    const open = parseArena(Array.from({ length: 40 }, () => '.'.repeat(120)));
    const shells: Shell[] = [spawnShell({ x: TILE_SIZE * 2, y: TILE_SIZE * 20 }, 0)];
    const steps = Math.ceil(SHELL.life / DT) + 2;
    for (let i = 0; i < steps; i++) stepShells(shells, open, DT);
    expect(shells).toHaveLength(0);
  });
});
