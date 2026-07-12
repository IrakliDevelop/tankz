import type { Vec2 } from './types';

/** Side of one arena tile, in world pixels. */
export const TILE_SIZE = 32;

/** Fixed simulation timestep (seconds). */
export const SIM_DT = 1 / 60;

export const TANK = {
  radius: 13,          // collision circle, px
  accel: 520,          // px/s²
  maxSpeed: 210,       // px/s forward
  maxReverseSpeed: 120, // px/s backward
  friction: 4,         // 1/s exponential decay when throttle is released
  hullTurnRate: 2.7,   // rad/s
  turretTurnRate: 5.0, // rad/s
  muzzleOffset: 26,    // px from tank centre to shell spawn, along the turret
} as const;

export const SHELL = {
  speed: 640,    // px/s
  life: 1.5,     // seconds before despawn
  cooldown: 0.3, // seconds between shots
} as const;

/** Player start position — must be open floor in DEMO_LAYOUT. */
export const SPAWN: Vec2 = { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 };
