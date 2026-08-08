import type { Vec2 } from './types';

/**
 * Everything the sim knows about the player's wishes for one step.
 * Built by the view layer from keyboard/mouse; a replay or network layer
 * would feed the same shape.
 */
export interface InputIntent {
  throttle: number; // -1..1: forward/backward drive
  steer: number; // -1..1: hull rotation (positive = clockwise on screen)
  aimPoint: Vec2; // world-pixel point the turret should track
  fire: boolean;
  /** Zero-based index into the current between-wave offer. */
  upgradeChoice: number | null;
  restart: boolean;
}

export function nullIntent(): InputIntent {
  return {
    throttle: 0,
    steer: 0,
    aimPoint: { x: 0, y: 0 },
    fire: false,
    upgradeChoice: null,
    restart: false,
  };
}
