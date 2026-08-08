export type EntityId = number;

export type Team = 'player' | 'enemy';

export type GamePhase = 'combat' | 'upgrade' | 'gameOver' | 'victory';

/** 2D vector in world pixels. x right, y down (Pixi convention). */
export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
