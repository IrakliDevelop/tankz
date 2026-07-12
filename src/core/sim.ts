import type { Arena } from './arena';
import { DEMO_LAYOUT, parseArena } from './arena';
import type { InputIntent } from './input';
import type { Shell } from './projectile';
import { spawnShell, stepShells } from './projectile';
import type { TankState } from './tank';
import { createTank, stepTank } from './tank';
import { SHELL, SIM_DT, SPAWN, TANK } from './config';

/** The complete simulation state. Pure data — no Pixi, no DOM. */
export interface SimState {
  arena: Arena;
  tank: TankState;
  shells: Shell[];
  /** Seconds until the gun may fire again. */
  cooldown: number;
}

export function createSim(): SimState {
  return {
    arena: parseArena(DEMO_LAYOUT),
    tank: createTank(SPAWN.x, SPAWN.y),
    shells: [],
    cooldown: 0,
  };
}

/** Advance the world by exactly one fixed timestep. */
export function stepSim(state: SimState, intent: InputIntent): void {
  const dt = SIM_DT;

  stepTank(state.tank, intent, state.arena, dt);

  state.cooldown = Math.max(0, state.cooldown - dt);
  if (intent.fire && state.cooldown === 0) {
    state.cooldown = SHELL.cooldown;
    const a = state.tank.turretAngle;
    const muzzle = {
      x: state.tank.pos.x + Math.cos(a) * TANK.muzzleOffset,
      y: state.tank.pos.y + Math.sin(a) * TANK.muzzleOffset,
    };
    state.shells.push(spawnShell(muzzle, a));
  }

  stepShells(state.shells, state.arena, dt);
}
