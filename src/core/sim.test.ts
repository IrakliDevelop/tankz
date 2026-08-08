import { describe, expect, it } from 'vitest';
import { DEFAULT_ARENA_TEMPLATE, arenaTemplateForWave } from './arena';
import { SHELL, SIM_DT, TANK, WAVE } from './config';
import { enemyRadius } from './enemy';
import { takeId } from './ids';
import { nullIntent, type InputIntent } from './input';
import { createPickup } from './pickup';
import { spawnShell } from './projectile';
import { createSim, stepSim } from './sim';

const SPAWN = DEFAULT_ARENA_TEMPLATE.playerSpawn;

function fireIntent(): InputIntent {
  return {
    ...nullIntent(),
    aimPoint: { x: SPAWN.x + 100, y: SPAWN.y },
    fire: true,
  };
}

describe('createSim', () => {
  it('starts a seeded run with an id-bearing player and first wave', () => {
    const sim = createSim(123);
    expect(sim.players).toHaveLength(1);
    expect(sim.players[0].id).toBe(1);
    expect(sim.players[0].body.pos).toEqual(SPAWN);
    expect(sim.players[0].hp).toBe(TANK.maxHp);
    expect(sim.enemies).toHaveLength(WAVE.baseEnemies + 1);
    expect(sim.arenaId).toBe('salvageYard');
    expect(sim.phase).toBe('combat');
    expect(sim.wave).toBe(1);
  });
});

describe('combat', () => {
  it('fires from the muzzle and starts the player cooldown', () => {
    const sim = createSim(123);
    for (const enemy of sim.enemies) enemy.cooldown = 999;
    stepSim(sim, fireIntent());
    const playerShells = sim.shells.filter((shell) => shell.team === 'player');
    expect(playerShells).toHaveLength(1);
    expect(sim.players[0].cooldown).toBeCloseTo(SHELL.cooldown);
    expect(playerShells[0].pos.x).toBeCloseTo(SPAWN.x + TANK.muzzleOffset + SHELL.speed * SIM_DT);
    expect(playerShells[0].pos.y).toBeCloseTo(SPAWN.y);
  });

  it('does not fire again until the cooldown expires', () => {
    const sim = createSim(123);
    sim.enemies = [sim.enemies[0]];
    sim.enemies[0].cooldown = 999;
    stepSim(sim, fireIntent());
    stepSim(sim, fireIntent());
    expect(sim.shells.filter((shell) => shell.team === 'player')).toHaveLength(1);

    const steps = Math.ceil(SHELL.cooldown / SIM_DT) + 1;
    for (let i = 0; i < steps; i++) stepSim(sim, fireIntent());
    expect(sim.shells.filter((shell) => shell.team === 'player').length).toBeGreaterThanOrEqual(2);
  });

  it('applies enemy shell damage to shield before armor', () => {
    const sim = createSim(123);
    const player = sim.players[0];
    player.shield = 10;
    for (const enemy of sim.enemies) enemy.cooldown = 999;
    sim.shells.push(
      spawnShell(
        takeId(sim),
        {
          x: player.body.pos.x - SHELL.speed * SIM_DT,
          y: player.body.pos.y,
        },
        0,
        'enemy',
        sim.enemies[0].id,
        15,
      ),
    );

    stepSim(sim, nullIntent());
    expect(player.shield).toBe(0);
    expect(player.hp).toBe(TANK.maxHp - 5);
  });

  it('prevents player and enemy hulls from overlapping', () => {
    const sim = createSim(123);
    const player = sim.players[0];
    const enemy = sim.enemies[0];
    sim.enemies = [enemy];
    enemy.body.pos = { x: player.body.pos.x + 5, y: player.body.pos.y };
    enemy.cooldown = 999;

    stepSim(sim, nullIntent());

    const distance = Math.hypot(
      enemy.body.pos.x - player.body.pos.x,
      enemy.body.pos.y - player.body.pos.y,
    );
    expect(distance).toBeGreaterThanOrEqual(TANK.radius + enemyRadius(enemy) - 0.002);
  });

  it('kills enemies, awards salvage, and opens an upgrade choice', () => {
    const sim = createSim(123);
    const player = sim.players[0];
    const target = sim.enemies[0];
    sim.enemies = [target];
    target.body.pos = { x: player.body.pos.x + 80, y: player.body.pos.y };
    target.hp = 1;
    target.cooldown = 999;

    for (let i = 0; i < 20 && sim.phase === 'combat'; i++) {
      stepSim(sim, fireIntent());
    }

    expect(sim.enemies).toHaveLength(0);
    expect(sim.kills).toBe(1);
    expect(sim.salvage).toBe(WAVE.salvagePerKill);
    expect(sim.phase).toBe('upgrade');
    expect(new Set(sim.upgradeChoices).size).toBe(3);
  });
});

describe('run progression', () => {
  it('applies a chosen part and starts the next wave', () => {
    const sim = createSim(456);
    sim.enemies = [];
    stepSim(sim, nullIntent());
    const selected = sim.upgradeChoices[0];

    stepSim(sim, { ...nullIntent(), upgradeChoice: 0 });

    expect(sim.players[0].upgrades[selected]).toBe(1);
    expect(sim.wave).toBe(2);
    expect(sim.phase).toBe('combat');
    expect(sim.enemies).toHaveLength(WAVE.baseEnemies + 2);
  });

  it('moves into a larger arena at wave three and clears room-local drops', () => {
    const sim = createSim(456);
    const oldRevision = sim.arenaRevision;
    sim.wave = 2;
    sim.phase = 'upgrade';
    sim.upgradeChoices = ['fieldRepair'];
    sim.pickups.push(createPickup(takeId(sim), 'repair', sim.players[0].body.pos));

    stepSim(sim, { ...nullIntent(), upgradeChoice: 0 });

    const template = arenaTemplateForWave(3);
    expect(sim.arenaId).toBe('freightDepot');
    expect(sim.arenaRevision).toBe(oldRevision + 1);
    expect(sim.arena.cols).toBe(32);
    expect(sim.players[0].body.pos).toEqual(template.playerSpawn);
    expect(sim.players[0].body.speed).toBe(0);
    expect(sim.pickups).toHaveLength(0);
  });

  it('ends in victory after the final wave is cleared', () => {
    const sim = createSim(456);
    sim.wave = WAVE.maxWaves;
    sim.enemies = [];
    stepSim(sim, nullIntent());
    expect(sim.phase).toBe('victory');
  });

  it('restarts a completed run with a new deterministic seed', () => {
    const sim = createSim(456);
    sim.phase = 'gameOver';
    const previousSeed = sim.rngState;
    stepSim(sim, { ...nullIntent(), restart: true });
    expect(sim.phase).toBe('combat');
    expect(sim.runNumber).toBe(2);
    expect(sim.rngState).not.toBe(previousSeed);
    expect(sim.kills).toBe(0);
  });
});

describe('determinism', () => {
  it('identical seeds and intent sequences produce identical states', () => {
    const script = (index: number): InputIntent => ({
      ...nullIntent(),
      throttle: index < 90 ? 1 : 0,
      steer: index < 30 ? 1 : 0,
      aimPoint: { x: 300, y: 200 },
      fire: index === 40 || index === 80,
    });

    const a = createSim(0xcafe);
    const b = createSim(0xcafe);
    for (let i = 0; i < 120; i++) {
      stepSim(a, script(i));
      stepSim(b, script(i));
    }

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
