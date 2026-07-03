import * as THREE from 'three';

/**
 * Shells + muzzle-flash / impact sparks.
 *
 * This class is a tiny "system": main.js owns one ProjectileSystem and calls
 * spawn() on fire and update() every frame. It keeps its own list of live
 * shells and particles, moves them, checks collisions, and cleans up. Keeping
 * this bookkeeping in one place is a common way to keep the main loop tidy.
 */
export class ProjectileSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.shells = [];
    this.sparks = [];
    this.puffs = [];        // smoke / dust clouds
    this.flashes = [];      // short-lived muzzle-flash lights

    // Reusable geometry/material — cheaper than making new ones per shot.
    this.shellGeo = new THREE.SphereGeometry(0.25, 10, 8);
    this.shellMat = new THREE.MeshStandardMaterial({
      color: 0xffd257, emissive: 0xff8a00, emissiveIntensity: 1.4,
    });
    this.sparkGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.puffGeo = new THREE.SphereGeometry(0.5, 8, 8);
    this.puffMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true });

    this.speed = 55;      // shell speed, m/s
    this.life = 2.5;      // seconds before a stray shell despawns
  }

  spawn(position, direction) {
    const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.shells.push({
      mesh,
      vel: direction.clone().multiplyScalar(this.speed),
      age: 0,
    });
    // Muzzle feedback: spark burst + a real flash of light + drifting smoke.
    this.#burst(position, 6, 0xffd257);
    this.#flash(position);
    this.smoke(position, {
      count: 4, color: 0x5a5a5a, size: 0.5, rise: 1.0, spread: 1.2, drift: direction,
    });
  }

  /**
   * Emit a puff of smoke/dust. Used both for the muzzle (with `drift` pushing
   * the cloud out the barrel) and for driving dust (called from the game loop).
   */
  smoke(pos, { count = 4, color = 0x777777, size = 0.5, rise = 1, spread = 1.2, life = 0.7, drift } = {}) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.puffGeo, this.puffMat.clone());
      mesh.material.color.setHex(color);
      mesh.position.copy(pos);
      const s = size * (0.6 + Math.random() * 0.6);
      mesh.scale.setScalar(s);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        rise * (0.4 + Math.random() * 0.6),
        (Math.random() - 0.5) * spread
      );
      if (drift) vel.addScaledVector(drift, 2 + Math.random() * 2);
      this.scene.add(mesh);
      this.puffs.push({
        mesh, vel, age: 0,
        life: life * (0.7 + Math.random() * 0.6),
        growth: s * 2,   // clouds expand as they dissipate
      });
    }
  }

  /** A brief point light at the muzzle — actually illuminates the scene. */
  #flash(pos) {
    const light = new THREE.PointLight(0xffb04a, 8, 14, 2);
    light.position.copy(pos);
    this.scene.add(light);
    this.flashes.push({ light, age: 0, life: 0.09 });
  }

  update(dt, onHitTarget) {
    // --- Move & test shells (iterate backwards so we can splice safely) ---
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.age += dt;
      s.mesh.position.addScaledVector(s.vel, dt);

      let dead = s.age > this.life;

      // Hit a solid obstacle/wall?
      if (!dead) {
        for (const o of this.world.obstacles) {
          if (o.box.containsPoint(s.mesh.position)) {
            this.#burst(s.mesh.position, 10, 0xffb347);
            dead = true;
            break;
          }
        }
      }

      // Hit a live target?
      if (!dead) {
        for (const t of this.world.targets) {
          if (t.alive && t.box.containsPoint(s.mesh.position)) {
            this.#burst(s.mesh.position, 16, 0xff5533);
            this.world.hitTarget(t);
            onHitTarget?.();
            dead = true;
            break;
          }
        }
      }

      if (dead) {
        this.scene.remove(s.mesh);
        this.shells.splice(i, 1);
      }
    }

    // --- Age out spark particles ---
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.age += dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.9);          // drag
      p.mesh.material.opacity = Math.max(0, 1 - p.age / p.life);
      if (p.age > p.life) {
        this.scene.remove(p.mesh);
        this.sparks.splice(i, 1);
      }
    }

    // --- Age out smoke/dust puffs: they rise, expand, and fade ---
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(0.9);              // air drag
      p.mesh.scale.addScalar(p.growth * dt);  // billow outward
      p.mesh.material.opacity = Math.max(0, 1 - p.age / p.life) * 0.6;
      if (p.age > p.life) {
        this.scene.remove(p.mesh);
        this.puffs.splice(i, 1);
      }
    }

    // --- Fade out muzzle-flash lights ---
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      f.light.intensity = 8 * Math.max(0, 1 - f.age / f.life);
      if (f.age > f.life) {
        this.scene.remove(f.light);
        this.flashes.splice(i, 1);
      }
    }
  }

  /** Spawn a quick puff of `count` particles flying outward from `pos`. */
  #burst(pos, count, color) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
      mesh.material.color.setHex(color);
      mesh.material.transparent = true;
      mesh.position.copy(pos);
      // Random-ish direction. Math.random is fine here — purely cosmetic.
      const dir = new THREE.Vector3(
        Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5
      ).normalize();
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        vel: dir.multiplyScalar(6 + Math.random() * 6),
        age: 0,
        life: 0.4 + Math.random() * 0.3,
      });
    }
  }
}
