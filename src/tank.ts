import * as THREE from 'three';
import { circleHitsBoxes, tankBox } from './physics';
import type { Combatant, Obstacle, Team } from './types';
import type { Input } from './input';

/**
 * The player's tank.
 *
 * Scene-graph trick: the tank is a nested set of Groups.
 *
 *   root (position + hull heading on the map)
 *    └─ hull mesh
 *    └─ turret (rotates independently to aim at the mouse)
 *        └─ barrel (offset forward so shells spawn from the muzzle)
 *
 * Because the barrel is a child of the turret which is a child of the root,
 * Three.js multiplies all their transforms for us. To find where a shell
 * should spawn and which way it flies, we just read the barrel's *world*
 * position/direction — no manual trig required.
 */
export class Tank implements Combatant {
  readonly root = new THREE.Group();
  // `!` = "assigned later" (in #build); tells strict TS we know it's set.
  turret!: THREE.Group;
  private barrel!: THREE.Mesh;
  private muzzle!: THREE.Object3D;

  readonly speed = 18;           // metres per second
  readonly turnSpeed = 2.4;      // radians per second (hull steering)
  readonly turretTurnSpeed = 2.0; // radians per second (Z/X turret rotation)
  readonly radius = 1.8;         // collision radius (treat tank as a circle)

  recoil = 0;                    // 1 right after firing, decays to 0
  readonly barrelBaseZ = 1.8;    // barrel's resting forward offset

  // Combat state. `team` lets projectiles tell friend from foe.
  readonly team: Team = 'player';
  readonly maxHp = 100;
  hp = this.maxHp;
  alive = true;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.#build();
    this.reset();
  }

  #build() {
    // --- Hull ---
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.7, metalness: 0.1 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 3.6), hullMat);
    hull.position.y = 0.8;
    hull.castShadow = true;
    this.root.add(hull);

    // Simple tracks on either side for a bit of tank silhouette.
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 1 });
    for (const side of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 3.9), trackMat);
      track.position.set(side * 1.5, 0.45, 0);
      track.castShadow = true;
      this.root.add(track);
    }

    // --- Turret (child so it can spin independently of the hull) ---
    this.turret = new THREE.Group();
    this.turret.position.y = 1.5;
    this.root.add(this.turret);

    const turretMat = new THREE.MeshStandardMaterial({ color: 0x5c8a44, roughness: 0.6 });
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.7, 20), turretMat);
    dome.castShadow = true;
    this.turret.add(dome);

    // --- Barrel: a child of the turret, pointing along +Z (forward) ---
    // Kept as `this.barrel` so we can slide it back on recoil.
    this.barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 2.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x2f3a24 })
    );
    this.barrel.rotation.x = Math.PI / 2;   // cylinders are vertical by default; lay it flat
    this.barrel.position.set(0, 0.1, this.barrelBaseZ);  // push it out the front of the turret
    this.barrel.castShadow = true;
    this.turret.add(this.barrel);

    // An empty marker at the very tip of the barrel = the muzzle.
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, 3.1);
    this.turret.add(this.muzzle);
  }

  reset() {
    this.root.position.set(0, 0, 0);
    this.root.rotation.y = 0;
    this.turret.rotation.y = 0;
    this.hp = this.maxHp;
    this.alive = true;
  }

  /** Axis-aligned box used for shell collisions. */
  getBox(): THREE.Box3 {
    return tankBox(this.root.position.x, this.root.position.z);
  }

  /** Apply damage; returns true if this shot destroyed the tank. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  /** Called on fire: sets recoil to full; update() animates it back down. */
  kick() {
    this.recoil = 1;
  }

  /** The turret's heading in world space (hull angle + turret's local angle). */
  getTurretWorldAngle(): number {
    return this.root.rotation.y + this.turret.rotation.y;
  }

  /**
   * Advance the tank one frame.
   * @param dt        seconds since last frame
   * @param input     Input helper (keyboard state)
   * @param obstacles solids to slide against
   */
  update(dt: number, input: Input, obstacles: Obstacle[]): void {
    // --- Steering: A/D or ←/→ rotate the hull in place ---
    const turn = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) -
                 (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    const dHull = turn * this.turnSpeed * dt;
    this.root.rotation.y += dHull;
    // The turret is a child of the hull, so a spinning hull would drag it
    // along. Counter-rotate it by the same amount so its *world* direction
    // stays put — steering repositions the hull under a stable gun/camera,
    // which is the Tanki-style feel we want.
    this.turret.rotation.y -= dHull;

    // --- Turret: Z/X swing the turret (and thus the camera) ---
    const turretTurn = (input.isDown('KeyZ') ? 1 : 0) - (input.isDown('KeyX') ? 1 : 0);
    this.turret.rotation.y += turretTurn * this.turretTurnSpeed * dt;

    // --- Drive: W/S or ↑/↓ move along the hull's current facing ---
    const drive = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) -
                  (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    if (drive !== 0) {
      // Forward vector for a Y-rotation of `a` is (sin a, 0, cos a).
      const a = this.root.rotation.y;
      const step = drive * this.speed * dt;
      const nextX = this.root.position.x + Math.sin(a) * step;
      const nextZ = this.root.position.z + Math.cos(a) * step;
      this.#moveWithCollision(nextX, nextZ, obstacles);
    }

    // --- Recoil: bleed `recoil` back to 0, then pose the gun from it ---
    // Linear decay over ~0.22s. While it's non-zero the barrel slides back
    // into the turret and the whole turret noses up (muzzle climb), then
    // springs back to rest. Cheap, but it sells the weight of the shot.
    this.recoil = Math.max(0, this.recoil - dt / 0.22);
    this.barrel.position.z = this.barrelBaseZ - this.recoil * 0.55;
    this.turret.rotation.x = this.recoil * 0.14;
  }

  /**
   * World-space points just behind each track — where driving kicks up dust.
   * Computed by hand (rotating the local offset by the hull's Y angle) so it
   * doesn't depend on Three.js having refreshed the matrix this frame.
   */
  getExhaustPoints(): THREE.Vector3[] {
    const a = this.root.rotation.y;
    const cos = Math.cos(a), sin = Math.sin(a);
    const z = -2.1; // behind the hull
    return [-1.5, 1.5].map((x) => new THREE.Vector3(
      this.root.position.x + x * cos + z * sin,
      0.2,
      this.root.position.z - x * sin + z * cos
    ));
  }

  /**
   * Try to move to (nextX, nextZ). We test each axis separately so that
   * sliding along a wall still works instead of sticking. Classic trick.
   */
  #moveWithCollision(nextX: number, nextZ: number, obstacles: Obstacle[]): void {
    const p = this.root.position;
    const r = this.radius;

    if (!circleHitsBoxes(nextX, p.z, r, obstacles)) p.x = nextX;
    if (!circleHitsBoxes(p.x, nextZ, r, obstacles)) p.z = nextZ;
  }

  /** World-space spawn point + forward direction for a fired shell. */
  getMuzzle(): { position: THREE.Vector3; direction: THREE.Vector3 } {
    const position = new THREE.Vector3();
    this.muzzle.getWorldPosition(position);

    // Direction = (muzzle world pos) - (turret world pos), flattened to XZ.
    const turretPos = new THREE.Vector3();
    this.turret.getWorldPosition(turretPos);
    const direction = position.clone().sub(turretPos).setY(0).normalize();

    return { position, direction };
  }
}
