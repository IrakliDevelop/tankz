import { describe, expect, it } from 'vitest';
import { parseArena } from './arena';
import { SIM_DT, TILE_SIZE } from './config';
import { createEnemy, stepEnemy } from './enemy';
import { createPlayer } from './player';

const openArena = parseArena(['########', '#......#', '#......#', '########']);

describe('enemy combat behavior', () => {
  it('scales durability with wave threat', () => {
    const early = createEnemy(2, 'raider', { x: 100, y: 50 }, 1);
    const late = createEnemy(2, 'raider', { x: 100, y: 50 }, 5);
    expect(late.maxHp).toBeGreaterThan(early.maxHp);
    expect(late.damage).toBeGreaterThan(early.damage);
  });

  it('bosses fire a three-shell spread when aimed at the player', () => {
    const player = createPlayer(1, {
      x: TILE_SIZE * 2,
      y: TILE_SIZE * 1.5,
    });
    const boss = createEnemy(2, 'boss', { x: TILE_SIZE * 6, y: TILE_SIZE * 1.5 }, 6);
    boss.body.turretAngle = Math.PI;
    boss.body.hullAngle = Math.PI;
    boss.cooldown = 0;
    expect(stepEnemy(boss, player, openArena, SIM_DT)).toHaveLength(3);
  });

  it('does not fire through solid cover', () => {
    const blocked = parseArena(['######', '#..#.#', '#....#', '######']);
    const player = createPlayer(1, {
      x: TILE_SIZE * 1.5,
      y: TILE_SIZE * 1.5,
    });
    const raider = createEnemy(2, 'raider', { x: TILE_SIZE * 4.5, y: TILE_SIZE * 1.5 }, 1);
    raider.body.turretAngle = Math.PI;
    raider.cooldown = 0;
    expect(stepEnemy(raider, player, blocked, SIM_DT)).toEqual([]);
  });
});
