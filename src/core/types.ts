export type Team = 'player' | 'enemy';
export type EntityId = number;

export interface Vec2 { x: number; z: number; }

export interface AABB { minX: number; maxX: number; minZ: number; maxZ: number; }

/** Anything a shell can damage — player tank and every enemy implement this. */
export interface Combatant {
  readonly id: EntityId;
  readonly team: Team;
  readonly alive: boolean;
  readonly position: Vec2;
  getAabb(): AABB;
  /** Apply damage; returns true if this shot destroyed the combatant. */
  takeDamage(amount: number): boolean;
}
