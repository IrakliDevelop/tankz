import { describe, expect, it } from 'vitest';
import { spawnShell, stepShells, type Shell } from './projectile';
import { parseArena } from './arena';
import { SHELL, TILE_SIZE } from './config';

const arena = parseArena(['######', '#....#', '######']);
const midY = TILE_SIZE * 1.5;
const dt = 1 / 60;

function playerShell(x: number, y: number, id = 1): Shell {
  return spawnShell(id, { x, y }, 0, 'player', 99, SHELL.damage);
}

describe('spawnShell', () => {
  it('sets identity, ownership, damage, and velocity', () => {
    const shell = playerShell(100, midY, 7);
    expect(shell.id).toBe(7);
    expect(shell.team).toBe('player');
    expect(shell.ownerId).toBe(99);
    expect(shell.damage).toBe(SHELL.damage);
    expect(shell.vel.x).toBeCloseTo(SHELL.speed);
    expect(shell.vel.y).toBeCloseTo(0);
    expect(shell.age).toBe(0);
  });

  it('copies the muzzle position instead of aliasing it', () => {
    const muzzle = { x: 100, y: midY };
    const shell = spawnShell(1, muzzle, 0, 'player', 99, SHELL.damage);
    muzzle.x = 999;
    expect(shell.pos.x).toBe(100);
  });
});

describe('stepShells', () => {
  it('moves shells by velocity times dt', () => {
    const shells = [playerShell(TILE_SIZE * 1.5, midY)];
    stepShells(shells, arena, dt);
    expect(shells[0].pos.x).toBeCloseTo(TILE_SIZE * 1.5 + SHELL.speed * dt);
  });

  it('despawns a wall hit and reports its impact position', () => {
    const shells = [playerShell(TILE_SIZE * 4.5, midY)];
    const impacts = [];
    for (let i = 0; i < 30 && shells.length > 0; i++) {
      impacts.push(...stepShells(shells, arena, dt));
    }
    expect(shells).toHaveLength(0);
    expect(impacts).toHaveLength(1);
  });

  it('despawns a shell past its lifetime', () => {
    const open = parseArena(Array.from({ length: 40 }, () => '.'.repeat(120)));
    const shells = [playerShell(TILE_SIZE * 2, TILE_SIZE * 20)];
    const steps = Math.ceil(SHELL.life / dt) + 2;
    for (let i = 0; i < steps; i++) stepShells(shells, open, dt);
    expect(shells).toHaveLength(0);
  });
});
