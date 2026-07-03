import * as THREE from 'three';
import type { Obstacle } from './types';

/**
 * The World holds everything that isn't the player: the ground, the arena
 * walls, and crate obstacles.
 *
 * A key game-dev idea here: for gameplay we don't use the fancy 3D meshes for
 * collision. Instead every solid thing also gets a simple axis-aligned box
 * (THREE.Box3) that we test against. Cheap math, "good enough" accuracy — this
 * is exactly how a lot of arcade games fake physics.
 */
export class World {
  readonly half = 40;               // arena extends from -half..+half on X and Z
  readonly obstacles: Obstacle[] = []; // solid, block tanks & shells

  constructor(private scene: THREE.Scene) {
    this.#buildGround();
    this.#buildWalls();
    this.#buildObstacles();
  }

  #buildGround() {
    // A large plane. Planes are created facing +Z, so rotate flat onto XZ.
    const geo = new THREE.PlaneGeometry(this.half * 2, this.half * 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a3546, roughness: 1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // A grid overlay just makes motion readable — you can feel the tank move.
    const grid = new THREE.GridHelper(this.half * 2, 40, 0x3f5675, 0x27364a);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  #buildWalls() {
    // Four boundary walls so you can't drive off the map.
    const h = 2, t = 1, s = this.half;
    const mat = new THREE.MeshStandardMaterial({ color: 0x3d4d63, roughness: 0.9 });
    const specs = [
      [0, s, s * 2 + t, t], // north (x, z, width, depth)
      [0, -s, s * 2 + t, t], // south
      [s, 0, t, s * 2 + t], // east
      [-s, 0, t, s * 2 + t], // west
    ];
    for (const [x, z, w, d] of specs) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
    }
  }

  #buildObstacles() {
    // A scattering of crates. Fixed positions (no RNG) so the map is stable.
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b5636, roughness: 0.8 });
    const spots = [
      [-14, -10, 4], [12, -16, 3], [20, 8, 5], [-22, 14, 4],
      [4, 18, 3], [-6, -22, 3], [26, -6, 3], [-28, -4, 4],
    ];
    for (const [x, z, size] of spots) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
      mesh.position.set(x, size / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.obstacles.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
    }
  }

  /** A handful of scattered spawn points near the arena edges, for enemies. */
  get spawnPoints(): [number, number][] {
    return [[28, 28], [-28, 28], [28, -28], [-28, -28], [0, 32], [0, -32], [32, 0], [-32, 0]];
  }
}
