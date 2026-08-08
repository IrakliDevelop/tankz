import { describe, expect, it } from 'vitest';
import { parseArena } from './arena';
import { createTank } from './tank';
import { resolveTankCollisions, type TankCollider } from './vehicleCollision';

const openArena = parseArena(['..........', '..........', '..........']);

function collider(id: number, x: number, mass = 1): TankCollider {
  return { id, body: createTank(x, 40), radius: 10, mass };
}

describe('tank-to-tank collision', () => {
  it('separates equal-mass hulls equally', () => {
    const a = collider(1, 40);
    const b = collider(2, 50);
    resolveTankCollisions([a, b], openArena);
    expect(a.body.pos.x).toBeCloseTo(35);
    expect(b.body.pos.x).toBeCloseTo(55);
  });

  it('lets a heavy chassis displace a light chassis', () => {
    const light = collider(1, 40, 1);
    const heavy = collider(2, 50, 5);
    resolveTankCollisions([light, heavy], openArena);
    expect(40 - light.body.pos.x).toBeCloseTo(10 * (5 / 6));
    expect(heavy.body.pos.x - 50).toBeCloseTo(10 * (1 / 6));
  });

  it('removes closing speed with only a small bounce', () => {
    const a = collider(1, 40);
    const b = collider(2, 50);
    a.body.speed = 50;
    b.body.hullAngle = Math.PI;
    b.body.speed = 50;
    resolveTankCollisions([a, b], openArena);
    expect(Math.abs(a.body.speed)).toBeLessThan(2);
    expect(Math.abs(b.body.speed)).toBeLessThan(2);
  });

  it('is deterministic for coincident centers and input order', () => {
    const first = [collider(2, 40), collider(1, 40)];
    const second = [collider(1, 40), collider(2, 40)];
    resolveTankCollisions(first, openArena);
    resolveTankCollisions(second, openArena);

    const positions = (items: TankCollider[]) =>
      items.map(({ id, body }) => ({ id, pos: body.pos })).sort((a, b) => a.id - b.id);
    expect(positions(first)).toEqual(positions(second));
    expect(
      Math.hypot(
        first[0].body.pos.x - first[1].body.pos.x,
        first[0].body.pos.y - first[1].body.pos.y,
      ),
    ).toBeCloseTo(20);
  });
});
