import { Container, Graphics } from 'pixi.js';
import type { Arena } from '../core/arena';
import { tileAt } from '../core/arena';
import { TILE_SIZE } from '../core/config';
import type { EffectKind } from '../core/effects';
import type { EnemyKind } from '../core/enemy';
import type { PickupKind } from '../core/pickup';
import type { Team } from '../core/types';

export interface TankVisual {
  root: Container;
  hull: Container;
  turret: Container;
  health: Container;
  healthFill: Graphics;
  shield: Graphics;
  overdrive: Graphics;
}

type TankAppearance = 'player' | EnemyKind;

const TANK_PALETTE: Record<
  TankAppearance,
  { body: number; detail: number; barrel: number; hatch: number; scale: number }
> = {
  player: {
    body: 0x4e91a8,
    detail: 0x285b68,
    barrel: 0xd0e4d1,
    hatch: 0x8dd5c3,
    scale: 1,
  },
  raider: {
    body: 0xa34f32,
    detail: 0x632b25,
    barrel: 0xe2a66e,
    hatch: 0xf47a45,
    scale: 1,
  },
  brute: {
    body: 0x8c3530,
    detail: 0x4a2326,
    barrel: 0xd97b58,
    hatch: 0xffaa54,
    scale: 1.18,
  },
  boss: {
    body: 0x68404b,
    detail: 0x352831,
    barrel: 0xe86b52,
    hatch: 0xffc857,
    scale: 1.5,
  },
};

// Shapes point +x, matching the simulation's angle convention.
export function makeTankVisual(appearance: TankAppearance): TankVisual {
  const palette = TANK_PALETTE[appearance];
  const scale = palette.scale;
  const root = new Container({ label: appearance + '-tank' });

  const shadow = new Graphics()
    .ellipse(-1, 4 * scale, 19 * scale, 12 * scale)
    .fill({ color: 0x050707, alpha: 0.48 });
  const shield = new Graphics()
    .circle(0, 0, 22 * scale)
    .fill({ color: 0x58d8ff, alpha: 0.08 })
    .stroke({ width: 2, color: 0x8be6ff, alpha: 0.9 });
  shield.visible = false;
  const overdrive = new Graphics()
    .regularPoly(0, 0, 24 * scale, 8)
    .stroke({ width: 2, color: 0xffbd55, alpha: 0.78 });
  overdrive.visible = false;

  const hull = new Container();
  const hullBody = new Graphics()
    .roundRect(-18 * scale, -14 * scale, 36 * scale, 7 * scale, 2)
    .fill(0x252529)
    .roundRect(-18 * scale, 7 * scale, 36 * scale, 7 * scale, 2)
    .fill(0x252529)
    .roundRect(-15 * scale, -10 * scale, 30 * scale, 20 * scale, 4)
    .fill(palette.body)
    .roundRect(-11 * scale, -6 * scale, 13 * scale, 12 * scale, 2)
    .fill(palette.detail)
    .rect(-7 * scale, -8 * scale, 2 * scale, 16 * scale)
    .fill({ color: 0xf0d39b, alpha: 0.18 });
  hull.addChild(hullBody);

  const turret = new Container();
  const turretBody = new Graphics()
    .roundRect(5 * scale, -2.7 * scale, 23 * scale, 5.4 * scale, 2)
    .fill(palette.barrel)
    .circle(0, 0, 9 * scale)
    .fill(palette.detail)
    .circle(0, 0, 5 * scale)
    .fill(palette.hatch)
    .circle(-2 * scale, -2 * scale, 1.5 * scale)
    .fill({ color: 0xffffff, alpha: 0.3 });
  turret.addChild(turretBody);

  const health = new Container({ y: -25 * scale });
  const healthWidth = 32 * scale;
  const healthBackground = new Graphics()
    .roundRect(-healthWidth / 2 - 1, -1, healthWidth + 2, 6, 2)
    .fill({ color: 0x080a09, alpha: 0.85 });
  const healthFill = new Graphics()
    .rect(0, 0, healthWidth, 4)
    .fill(appearance === 'player' ? 0x7de38d : 0xf06449);
  healthFill.x = -healthWidth / 2;
  health.addChild(healthBackground, healthFill);

  root.addChild(shadow, overdrive, shield, hull, turret, health);
  return { root, hull, turret, health, healthFill, shield, overdrive };
}

export function makeArenaVisual(arena: Arena): Container {
  const root = new Container({ label: 'arena' });
  const floor = new Graphics();
  floor.rect(0, 0, arena.cols * TILE_SIZE, arena.rows * TILE_SIZE).fill(0x171812);

  for (let row = 0; row < arena.rows; row++) {
    for (let col = 0; col < arena.cols; col++) {
      const kind = tileAt(arena, col, row);
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      if (kind === 'floor') {
        if ((col * 7 + row * 3) % 5 === 0) {
          floor
            .moveTo(x + 5, y + 11)
            .lineTo(x + 17, y + 8)
            .lineTo(x + 24, y + 16)
            .stroke({ width: 1, color: 0x302d22, alpha: 0.55 });
        }
        continue;
      }
      if (kind === 'wall') {
        floor
          .rect(x, y, TILE_SIZE, TILE_SIZE)
          .fill(0x33342f)
          .rect(x + 2, y + 2, TILE_SIZE - 4, 5)
          .fill(0x494942)
          .rect(x + 5, y + 12, TILE_SIZE - 10, 2)
          .fill({ color: 0x151611, alpha: 0.8 });
      } else {
        floor
          .roundRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 3)
          .fill(0x5c4931)
          .roundRect(x + 7, y + 7, TILE_SIZE - 14, TILE_SIZE - 14, 2)
          .fill(0x765535)
          .moveTo(x + 8, y + 9)
          .lineTo(x + 24, y + 23)
          .stroke({ width: 2, color: 0x382b21 });
      }
    }
  }

  const border = new Graphics()
    .rect(0, 0, arena.cols * TILE_SIZE, arena.rows * TILE_SIZE)
    .stroke({ width: 3, color: 0xb05b36, alpha: 0.28 });
  root.addChild(floor, border);
  return root;
}

export function makeShellVisual(team: Team): Container {
  const root = new Container({ label: team + '-shell' });
  const color = team === 'player' ? 0xffe6a1 : 0xff754f;
  root.addChild(
    new Graphics().circle(0, 0, 6).fill({ color, alpha: 0.18 }).circle(0, 0, 3).fill(color),
  );
  return root;
}

export function makePickupVisual(kind: PickupKind): Container {
  const root = new Container({ label: kind + '-pickup' });
  const graphics = new Graphics();
  if (kind === 'repair') {
    graphics
      .circle(0, 0, 12)
      .fill({ color: 0x6dff9b, alpha: 0.14 })
      .circle(0, 0, 7)
      .fill(0x285b3b)
      .rect(-2, -5, 4, 10)
      .fill(0x9bffb7)
      .rect(-5, -2, 10, 4)
      .fill(0x9bffb7);
  } else if (kind === 'shield') {
    graphics
      .circle(0, 0, 13)
      .fill({ color: 0x58d8ff, alpha: 0.14 })
      .regularPoly(0, 0, 8, 6)
      .fill(0x22566d)
      .stroke({ width: 2, color: 0x8be6ff });
  } else {
    graphics
      .circle(0, 0, 13)
      .fill({ color: 0xffb84d, alpha: 0.14 })
      .poly([-3, -9, 5, -9, 1, -1, 7, -1, -5, 10, -1, 2, -7, 2], true)
      .fill(0xffc260);
  }
  root.addChild(graphics);
  return root;
}

export function makeEffectVisual(kind: EffectKind): Container {
  const root = new Container({ label: kind + '-effect' });
  const graphics = new Graphics();
  if (kind === 'impact') {
    graphics.star(0, 0, 6, 9, 2).fill(0xffc45f).circle(0, 0, 3).fill(0xffffff);
  } else if (kind === 'explosion') {
    graphics
      .circle(0, 0, 18)
      .fill({ color: 0xf25f3a, alpha: 0.3 })
      .circle(0, 0, 11)
      .fill(0xff9e45)
      .circle(0, 0, 5)
      .fill(0xffec9b);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      graphics
        .moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12)
        .lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25)
        .stroke({ width: 2, color: 0xff7847, alpha: 0.75 });
    }
  } else if (kind === 'repair') {
    graphics
      .circle(0, 0, 15)
      .stroke({ width: 3, color: 0x76ff9f, alpha: 0.75 })
      .rect(-2, -9, 4, 18)
      .fill(0xb0ffc3)
      .rect(-9, -2, 18, 4)
      .fill(0xb0ffc3);
  } else if (kind === 'shield') {
    graphics
      .circle(0, 0, 16)
      .fill({ color: 0x58d8ff, alpha: 0.12 })
      .regularPoly(0, 0, 14, 6)
      .stroke({ width: 3, color: 0x8be6ff, alpha: 0.9 });
  } else {
    graphics
      .circle(0, 0, 17)
      .stroke({ width: 3, color: 0xffbd55, alpha: 0.85 })
      .star(0, 0, 4, 11, 5)
      .fill({ color: 0xffd276, alpha: 0.8 });
  }
  root.addChild(graphics);
  return root;
}
