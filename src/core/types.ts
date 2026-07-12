export type EntityId = number;

/** 2D vector in world pixels. x right, y down (Pixi convention). */
export interface Vec2 { x: number; y: number; }

export interface AABB { minX: number; maxX: number; minY: number; maxY: number; }
