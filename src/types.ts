import * as THREE from 'three';

/** Which side a tank (or a shell) belongs to. */
export type Team = 'player' | 'enemy';

/** A solid thing in the world that blocks tanks and shells. */
export interface Obstacle {
  mesh: THREE.Object3D;
  box: THREE.Box3;
}

/**
 * Anything a shell can damage — the player tank and every enemy implement this.
 * Coding the projectile system against this interface (rather than the concrete
 * Tank/Enemy classes) keeps it decoupled from who's actually fighting.
 */
export interface Combatant {
  team: Team;
  alive: boolean;
  root: THREE.Object3D;
  getBox(): THREE.Box3;
  /** Apply damage; returns true if this shot destroyed the combatant. */
  takeDamage(amount: number): boolean;
}
