import { describe, it, expect } from 'vitest';
import { createTank, stepTank } from './tank';
import { nullIntent } from './input';
import { parseArena } from './arena';
import { TANK, TILE_SIZE } from './config';

// 6×3 tiles: a corridor of open floor from (1,1) to (4,1), walled all around.
const corridor = parseArena(['######', '#....#', '######']);
const midY = TILE_SIZE * 1.5; // vertical centre of the corridor

const DT = 1 / 60;

function tankAt(x: number, y: number) {
  return createTank(x, y);
}

describe('hull driving', () => {
  it('throttle accelerates the tank along its heading (+x at angle 0)', () => {
    const tank = tankAt(TILE_SIZE * 1.5, midY);
    const intent = { ...nullIntent(), throttle: 1 };
    stepTank(tank, intent, corridor, DT);
    expect(tank.speed).toBeCloseTo(TANK.accel * DT);
    expect(tank.pos.x).toBeGreaterThan(TILE_SIZE * 1.5);
    expect(tank.pos.y).toBeCloseTo(midY);
  });

  it('speed is clamped to maxSpeed', () => {
    const tank = tankAt(TILE_SIZE * 1.5, midY);
    const intent = { ...nullIntent(), throttle: 1 };
    for (let i = 0; i < 300; i++) stepTank(tank, intent, corridor, DT);
    expect(tank.speed).toBeCloseTo(TANK.maxSpeed);
  });

  it('reverse speed is clamped to maxReverseSpeed', () => {
    const tank = tankAt(TILE_SIZE * 4.5, midY);
    const intent = { ...nullIntent(), throttle: -1 };
    for (let i = 0; i < 300; i++) stepTank(tank, intent, corridor, DT);
    expect(tank.speed).toBeCloseTo(-TANK.maxReverseSpeed);
  });

  it('friction decays speed toward zero when throttle is released', () => {
    const tank = tankAt(TILE_SIZE * 1.5, midY);
    stepTank(tank, { ...nullIntent(), throttle: 1 }, corridor, DT);
    const movingSpeed = tank.speed;
    for (let i = 0; i < 120; i++) stepTank(tank, nullIntent(), corridor, DT); // 2s coast
    expect(Math.abs(tank.speed)).toBeLessThan(movingSpeed * 0.05);
  });

  it('steer rotates the hull at hullTurnRate', () => {
    const tank = tankAt(TILE_SIZE * 2.5, midY);
    stepTank(tank, { ...nullIntent(), steer: 1 }, corridor, DT);
    expect(tank.hullAngle).toBeCloseTo(TANK.hullTurnRate * DT);
  });
});

describe('turret', () => {
  it('turns toward the aim point, capped at turretTurnRate per second', () => {
    const tank = tankAt(TILE_SIZE * 2.5, midY);
    // Aim straight down (+y): target angle π/2, far beyond one step's cap.
    const intent = { ...nullIntent(), aimPoint: { x: tank.pos.x, y: tank.pos.y + 100 } };
    stepTank(tank, intent, corridor, DT);
    expect(tank.turretAngle).toBeCloseTo(TANK.turretTurnRate * DT);
  });

  it('reaches and holds the target angle over time', () => {
    const tank = tankAt(TILE_SIZE * 2.5, midY);
    const intent = { ...nullIntent(), aimPoint: { x: tank.pos.x, y: tank.pos.y + 100 } };
    for (let i = 0; i < 120; i++) stepTank(tank, intent, corridor, DT);
    expect(tank.turretAngle).toBeCloseTo(Math.PI / 2);
  });
});

describe('collision', () => {
  it('driving into a wall stops at the wall face', () => {
    const tank = tankAt(TILE_SIZE * 4.5, midY);
    const intent = { ...nullIntent(), throttle: 1 }; // heading +x into the east wall
    for (let i = 0; i < 300; i++) stepTank(tank, intent, corridor, DT);
    const wallX = TILE_SIZE * 5; // east wall's inner face
    expect(tank.pos.x).toBeLessThanOrEqual(wallX - TANK.radius + 0.001);
    expect(tank.pos.x).toBeCloseTo(wallX - TANK.radius, 1);
  });
});
