import { describe, it, expect, beforeEach } from 'vitest';
import { createSim, stepSim } from './sim';
import { nullIntent, type InputIntent } from './input';
import { SHELL, SIM_DT, SPAWN, TANK } from './config';
import { resetIds } from './ids';

beforeEach(resetIds);

describe('createSim', () => {
  it('starts the tank at SPAWN with no shells', () => {
    const sim = createSim();
    expect(sim.tank.pos).toEqual(SPAWN);
    expect(sim.shells).toHaveLength(0);
    expect(sim.cooldown).toBe(0);
  });
});

describe('firing', () => {
  const fireIntent = (): InputIntent => ({ ...nullIntent(), aimPoint: { x: SPAWN.x + 100, y: SPAWN.y }, fire: true });

  it('spawns one shell at the muzzle and starts the cooldown', () => {
    const sim = createSim();
    stepSim(sim, fireIntent());
    expect(sim.shells).toHaveLength(1);
    expect(sim.cooldown).toBeCloseTo(SHELL.cooldown);
    // Turret starts at angle 0 aiming at a target straight ahead → muzzle is +x of centre
    // (shell has already flown one step by the time we observe it).
    expect(sim.shells[0].pos.x).toBeCloseTo(SPAWN.x + TANK.muzzleOffset + SHELL.speed * SIM_DT);
    expect(sim.shells[0].pos.y).toBeCloseTo(SPAWN.y);
  });

  it('does not fire again until the cooldown expires', () => {
    const sim = createSim();
    stepSim(sim, fireIntent());
    stepSim(sim, fireIntent()); // still cooling down
    expect(sim.shells).toHaveLength(1);
    const steps = Math.ceil(SHELL.cooldown / SIM_DT) + 1;
    for (let i = 0; i < steps; i++) stepSim(sim, fireIntent());
    expect(sim.shells.length).toBeGreaterThanOrEqual(2);
  });
});

describe('determinism', () => {
  it('identical intent sequences produce identical states', () => {
    // A scripted little drive: turn, accelerate, fire twice.
    const script = (i: number): InputIntent => ({
      throttle: i < 90 ? 1 : 0,
      steer: i < 30 ? 1 : 0,
      aimPoint: { x: 300, y: 200 },
      fire: i === 40 || i === 80,
    });

    resetIds();
    const a = createSim();
    for (let i = 0; i < 120; i++) stepSim(a, script(i));

    resetIds();
    const b = createSim();
    for (let i = 0; i < 120; i++) stepSim(b, script(i));

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
