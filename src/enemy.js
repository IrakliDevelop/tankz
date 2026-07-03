import * as THREE from 'three';
import { circleHitsBoxes, tankBox, stepAngle, wrapAngle } from './physics.js';

/**
 * An AI-controlled enemy tank.
 *
 * It shares the player's scene-graph shape (root → turret → barrel/muzzle) but
 * drives itself. The "brain" is deliberately simple state-free logic run every
 * frame — no pathfinding, just: aim turret at the player, keep a comfortable
 * distance from them (approach / retreat / circle), and shoot when lined up.
 * Simple rules like these already read as intelligent in a small arena.
 */
export class Enemy {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);

    this.speed = 12;
    this.turnSpeed = 1.6;
    this.turretTurnSpeed = 1.8;
    this.radius = 1.8;

    this.team = 'enemy';
    this.maxHp = 40;
    this.hp = this.maxHp;
    this.alive = true;

    this.fireCooldown = 1.6;   // seconds between shots
    this.lastShot = 0;
    this.hitFlash = 0;         // brief white flash when damaged

    // Preferred engagement range — it tries to sit in this band.
    this.nearRange = 14;
    this.farRange = 26;

    this.#build();
  }

  #build() {
    this.hullMat = new THREE.MeshStandardMaterial({ color: 0x8a3b32, roughness: 0.7 });
    this.turretMat = new THREE.MeshStandardMaterial({ color: 0x9c463b, roughness: 0.6 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 3.6), this.hullMat);
    hull.position.y = 0.8;
    hull.castShadow = true;
    this.root.add(hull);

    const trackMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 1 });
    for (const side of [-1, 1]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 3.9), trackMat);
      track.position.set(side * 1.5, 0.45, 0);
      track.castShadow = true;
      this.root.add(track);
    }

    this.turret = new THREE.Group();
    this.turret.position.y = 1.5;
    this.root.add(this.turret);

    const dome = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.7, 20), this.turretMat);
    dome.castShadow = true;
    this.turret.add(dome);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 2.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2320 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, 1.8);
    barrel.castShadow = true;
    this.turret.add(barrel);

    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, 3.1);
    this.turret.add(this.muzzle);
  }

  /** Drop the enemy back onto the map, full health, at a given spot. */
  spawnAt(x, z) {
    this.root.position.set(x, 0, z);
    this.root.rotation.y = 0;
    this.turret.rotation.y = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.hitFlash = 0;
    this.root.visible = true;
  }

  getBox() {
    return tankBox(this.root.position.x, this.root.position.z);
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 1;
    if (this.hp === 0) {
      this.alive = false;
      this.root.visible = false;
      return true;
    }
    return false;
  }

  /**
   * Run the AI for one frame.
   * @returns {boolean} true if it wants to fire a shell this frame.
   */
  update(dt, player, obstacles, elapsed) {
    // Fade the damage flash back to base colour.
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt * 3);
      const e = this.hitFlash * 0.8;
      this.hullMat.emissive.setRGB(e, e, e);
      this.turretMat.emissive.setRGB(e, e, e);
    }

    const px = player.root.position.x, pz = player.root.position.z;
    const dx = px - this.root.position.x, dz = pz - this.root.position.z;
    const dist = Math.hypot(dx, dz);
    const angleToPlayer = Math.atan2(dx, dz);

    // --- Turret: rotate to track the player (in world space) ---
    const desiredTurretWorld = angleToPlayer;
    const turretWorld = this.root.rotation.y + this.turret.rotation.y;
    const newTurretWorld = stepAngle(turretWorld, desiredTurretWorld, this.turretTurnSpeed * dt);
    this.turret.rotation.y = newTurretWorld - this.root.rotation.y;

    // --- Decide where the hull wants to point, and forward/back drive ---
    let desiredHull, drive;
    if (dist > this.farRange) {
      desiredHull = angleToPlayer;  // too far: face the player and close in
      drive = 1;
    } else if (dist < this.nearRange) {
      desiredHull = angleToPlayer;  // too close: keep facing them but reverse
      drive = -1;
    } else {
      desiredHull = angleToPlayer + Math.PI / 2;  // in range: circle-strafe
      drive = 1;
    }

    this.root.rotation.y = stepAngle(this.root.rotation.y, desiredHull, this.turnSpeed * dt);

    // Move along the hull's facing, sliding on obstacles like the player does.
    const a = this.root.rotation.y;
    const step = drive * this.speed * dt;
    const nextX = this.root.position.x + Math.sin(a) * step;
    const nextZ = this.root.position.z + Math.cos(a) * step;
    const r = this.radius;
    if (!circleHitsBoxes(nextX, this.root.position.z, r, obstacles)) this.root.position.x = nextX;
    if (!circleHitsBoxes(this.root.position.x, nextZ, r, obstacles)) this.root.position.z = nextZ;

    // --- Fire when the gun is lined up, in range, and reloaded ---
    const aimError = Math.abs(wrapAngle(desiredTurretWorld - newTurretWorld));
    const ready = elapsed - this.lastShot >= this.fireCooldown;
    if (ready && dist < 42 && aimError < 0.12) {
      this.lastShot = elapsed;
      return true;
    }
    return false;
  }

  /** World-space spawn point + forward direction for a fired shell. */
  getMuzzle() {
    const position = new THREE.Vector3();
    this.muzzle.getWorldPosition(position);
    const turretPos = new THREE.Vector3();
    this.turret.getWorldPosition(turretPos);
    const direction = position.clone().sub(turretPos).setY(0).normalize();
    return { position, direction };
  }
}
