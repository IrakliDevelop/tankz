import { Container, Graphics } from 'pixi.js';
import type { Arena } from '../core/arena';
import { tileAt } from '../core/arena';
import { TILE_SIZE } from '../core/config';

/**
 * Visual factories return plain Containers with an agreed internal shape.
 * Swapping these flat-vector Graphics for sprites later means changing only
 * what gets put INSIDE each container — the renderer contract stays the same.
 */

export interface TankVisual {
  root: Container;   // positioned at the tank's world position
  hull: Container;   // rotated to hullAngle
  turret: Container; // rotated to turretAngle
}

// All shapes are drawn pointing +x (angle 0), matching the sim convention.
export function makeTankVisual(): TankVisual {
  const root = new Container();

  const hull = new Container();
  const hullBody = new Graphics()
    .rect(-16, -14, 32, 5).fill(0x2f4155)      // top track
    .rect(-16, 9, 32, 5).fill(0x2f4155)        // bottom track
    .roundRect(-15, -10, 30, 20, 4).fill(0x4a7ab5)
    .roundRect(-11, -6, 14, 12, 3).fill(0x3a659c); // engine plate detail
  hull.addChild(hullBody);

  const turret = new Container();
  const turretBody = new Graphics()
    .rect(6, -2.5, 20, 5).fill(0x9fb8d8)       // barrel
    .circle(0, 0, 8).fill(0x6c95c8)
    .circle(0, 0, 4).fill(0x8ec5ff);           // hatch
  turret.addChild(turretBody);

  root.addChild(hull, turret);
  return { root, hull, turret };
}

export function makeArenaVisual(arena: Arena): Container {
  const root = new Container();
  const g = new Graphics();
  // Floor base.
  g.rect(0, 0, arena.cols * TILE_SIZE, arena.rows * TILE_SIZE).fill(0x151b24);
  // Subtle checker so motion is visible on open floor.
  for (let r = 0; r < arena.rows; r++) {
    for (let c = 0; c < arena.cols; c++) {
      if (tileAt(arena, c, r) === 'floor' && (c + r) % 2 === 0) {
        g.rect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(0x17202b);
      }
    }
  }
  // Solid tiles.
  for (let r = 0; r < arena.rows; r++) {
    for (let c = 0; c < arena.cols; c++) {
      const kind = tileAt(arena, c, r);
      if (kind === 'wall') {
        g.rect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(0x2b3a4d);
      } else if (kind === 'obstacle') {
        g.roundRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4, 4)
          .fill(0x4d4433);
      }
    }
  }
  root.addChild(g);
  return root;
}

export function makeShellVisual(): Container {
  const root = new Container();
  root.addChild(new Graphics().circle(0, 0, 3).fill(0xffe08a));
  return root;
}
