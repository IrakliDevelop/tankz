import type { Arena } from './arena';
import { isSolidAtPoint } from './arena';
import { ENEMY, TILE_SIZE } from './config';
import type { InputIntent } from './input';
import { nullIntent } from './input';
import { wrapAngle } from './physics';
import type { PlayerState } from './player';
import type { TankMovement, TankState } from './tank';
import { createTank, stepTank } from './tank';
import type { EntityId, Vec2 } from './types';

export type EnemyKind = 'raider' | 'brute' | 'boss';

export interface EnemyState {
  id: EntityId;
  kind: EnemyKind;
  body: TankState;
  hp: number;
  maxHp: number;
  cooldown: number;
  damage: number;
}

export interface EnemyShot {
  pos: Vec2;
  angle: number;
  damage: number;
}

export function createEnemy(id: EntityId, kind: EnemyKind, pos: Vec2, wave: number): EnemyState {
  const config = ENEMY[kind];
  const hpScale = 1 + (wave - 1) * ENEMY.hpGrowthPerWave;
  const damageScale = 1 + (wave - 1) * ENEMY.damageGrowthPerWave;
  const maxHp = Math.round(config.maxHp * hpScale);
  return {
    id,
    kind,
    body: createTank(pos.x, pos.y),
    hp: maxHp,
    maxHp,
    cooldown: config.fireCooldown * (0.35 + (id % 4) * 0.12),
    damage: Math.round(config.damage * damageScale),
  };
}

export function enemyRadius(enemy: EnemyState): number {
  return ENEMY[enemy.kind].radius;
}

export function stepEnemy(
  enemy: EnemyState,
  player: PlayerState,
  arena: Arena,
  dt: number,
): EnemyShot[] {
  const config = ENEMY[enemy.kind];
  const dx = player.body.pos.x - enemy.body.pos.x;
  const dy = player.body.pos.y - enemy.body.pos.y;
  const distance = Math.hypot(dx, dy);
  const angleToPlayer = Math.atan2(dy, dx);
  const retreatRange = config.preferredRange * ENEMY.retreatRangeRatio;

  let driveAngle = angleToPlayer;
  if (distance < retreatRange) {
    driveAngle = wrapAngle(angleToPlayer + Math.PI);
  } else if (distance < config.preferredRange) {
    const orbitDirection = enemy.id % 2 === 0 ? 1 : -1;
    driveAngle = wrapAngle(angleToPlayer + orbitDirection * Math.PI * 0.5);
  }

  const steeringError = wrapAngle(driveAngle - enemy.body.hullAngle);
  const intent: InputIntent = {
    ...nullIntent(),
    throttle: Math.abs(steeringError) < ENEMY.driveAngleTolerance ? 1 : 0.25,
    steer: Math.max(-1, Math.min(1, steeringError / ENEMY.steeringSoftness)),
    aimPoint: player.body.pos,
  };
  stepTank(enemy.body, intent, arena, dt, enemyMovement(enemy));

  enemy.cooldown = Math.max(0, enemy.cooldown - dt);
  const aimError = Math.abs(wrapAngle(angleToPlayer - enemy.body.turretAngle));
  if (
    enemy.cooldown > 0 ||
    distance > ENEMY.maxFireRange ||
    aimError > ENEMY.fireAngleTolerance ||
    !hasLineOfSight(arena, enemy.body.pos, player.body.pos)
  ) {
    return [];
  }

  enemy.cooldown = config.fireCooldown;
  const muzzleDistance = ENEMY.muzzleOffset * (config.radius / ENEMY.raider.radius);
  const shots: EnemyShot[] = [];
  for (let i = 0; i < config.shots; i++) {
    const spread = (i - (config.shots - 1) / 2) * config.shotSpread;
    const angle = enemy.body.turretAngle + spread;
    shots.push({
      pos: {
        x: enemy.body.pos.x + Math.cos(angle) * muzzleDistance,
        y: enemy.body.pos.y + Math.sin(angle) * muzzleDistance,
      },
      angle,
      damage: enemy.damage,
    });
  }
  return shots;
}

function enemyMovement(enemy: EnemyState): TankMovement {
  const config = ENEMY[enemy.kind];
  return {
    radius: config.radius,
    accel: config.accel,
    maxSpeed: config.speed,
    maxReverseSpeed: config.speed * ENEMY.reverseSpeedRatio,
    friction: ENEMY.friction,
    hullTurnRate: config.hullTurnRate,
    turretTurnRate: config.turretTurnRate,
  };
}

function hasLineOfSight(arena: Arena, from: Vec2, to: Vec2): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.ceil(distance / (TILE_SIZE * 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAtPoint(arena, { x: from.x + dx * t, y: from.y + dy * t })) {
      return false;
    }
  }
  return true;
}
