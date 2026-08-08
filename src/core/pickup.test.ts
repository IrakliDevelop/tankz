import { describe, expect, it } from 'vitest';
import { PICKUP, TANK } from './config';
import { collectPickups, createPickup, rollPickupKind, type PickupKind } from './pickup';
import { createPlayer } from './player';

describe('combat pickups', () => {
  it('repairs an injured player on contact and is consumed', () => {
    const player = createPlayer(1, { x: 50, y: 50 });
    player.hp = 40;
    const pickups = [createPickup(2, 'repair', { x: 55, y: 50 })];
    const collected = collectPickups(pickups, player);
    expect(player.hp).toBe(40 + PICKUP.repairAmount);
    expect(pickups).toHaveLength(0);
    expect(collected).toEqual([{ kind: 'repair', pos: { x: 55, y: 50 } }]);
  });

  it('leaves repair and shield pickups when their resource is full', () => {
    const player = createPlayer(1, { x: 50, y: 50 });
    player.shield = player.maxShield;
    const pickups = [
      createPickup(2, 'repair', { x: 50, y: 50 }),
      createPickup(3, 'shield', { x: 50, y: 50 }),
    ];
    collectPickups(pickups, player);
    expect(player.hp).toBe(TANK.maxHp);
    expect(pickups).toHaveLength(2);
  });

  it('caps shield and refreshes overdrive duration', () => {
    const player = createPlayer(1, { x: 50, y: 50 });
    player.shield = player.maxShield - 5;
    player.overdriveRemaining = 2;
    const pickups = [
      createPickup(2, 'shield', { x: 50, y: 50 }),
      createPickup(3, 'overdrive', { x: 50, y: 50 }),
    ];
    const collected = collectPickups(pickups, player);
    expect(player.shield).toBe(player.maxShield);
    expect(player.overdriveRemaining).toBe(PICKUP.overdriveDuration);
    expect(collected.map(({ kind }) => kind).sort()).toEqual(['overdrive', 'shield']);
  });
});

describe('pickup drops', () => {
  it('is deterministic and keeps the opening wave repair-only', () => {
    const sequence = (seed: number, wave: number): Array<PickupKind | null> => {
      const source = { rngState: seed };
      return Array.from({ length: 100 }, () => rollPickupKind(source, wave, 0.8));
    };
    expect(sequence(44, 6)).toEqual(sequence(44, 6));
    expect(sequence(44, 1).filter((kind) => kind !== null)).toEqual(
      expect.arrayContaining(['repair']),
    );
    expect(sequence(44, 1).every((kind) => kind === null || kind === 'repair')).toBe(true);
    expect(sequence(44, 6)).toContain('shield');
    expect(sequence(44, 6)).toContain('overdrive');
  });

  it('biases repair weight when armor is low', () => {
    const countRepair = (armorRatio: number) => {
      const source = { rngState: 77 };
      return Array.from({ length: 400 }, () => rollPickupKind(source, 6, armorRatio)).filter(
        (kind) => kind === 'repair',
      ).length;
    };
    expect(countRepair(0.2)).toBeGreaterThan(countRepair(0.9));
  });
});
