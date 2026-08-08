import { describe, expect, it } from 'vitest';
import { PICKUP, SHELL, TANK, UPGRADE } from './config';
import {
  applyPlayerDamage,
  applyUpgrade,
  createPlayer,
  effectiveFireCooldown,
  playerMovement,
  rollUpgradeChoices,
  stepPlayerStatus,
} from './player';

describe('player upgrades', () => {
  it('rolls three unique deterministic choices', () => {
    const a = rollUpgradeChoices({ rngState: 55 });
    const b = rollUpgradeChoices({ rngState: 55 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
  });

  it('stacks weapon and mobility upgrades', () => {
    const player = createPlayer(1, { x: 0, y: 0 });
    applyUpgrade(player, 'rapidFire');
    applyUpgrade(player, 'highExplosive');
    applyUpgrade(player, 'overdrive');
    applyUpgrade(player, 'multishot');

    expect(player.fireCooldown).toBeCloseTo(SHELL.cooldown * UPGRADE.rapidFireMultiplier);
    expect(player.shellDamage).toBe(SHELL.damage + UPGRADE.damageBonus);
    expect(player.speedMultiplier).toBeCloseTo(UPGRADE.speedMultiplier);
    expect(player.shotCount).toBe(2);
  });

  it('reinforced armor increases the cap and repairs damage', () => {
    const player = createPlayer(1, { x: 0, y: 0 });
    player.hp = 20;
    applyUpgrade(player, 'reinforcedArmor');
    expect(player.maxHp).toBe(TANK.maxHp + UPGRADE.armorBonus);
    expect(player.hp).toBe(20 + UPGRADE.armorHeal);
  });
});

describe('player combat status', () => {
  it('absorbs damage with shield before armor', () => {
    const player = createPlayer(1, { x: 0, y: 0 });
    player.shield = 12;
    applyPlayerDamage(player, 20);
    expect(player.shield).toBe(0);
    expect(player.hp).toBe(TANK.maxHp - 8);
  });

  it('temporarily boosts movement and fire rate, then expires', () => {
    const player = createPlayer(1, { x: 0, y: 0 });
    player.overdriveRemaining = PICKUP.overdriveDuration;
    expect(playerMovement(player).maxSpeed).toBeCloseTo(
      TANK.maxSpeed * PICKUP.overdriveSpeedMultiplier,
    );
    expect(effectiveFireCooldown(player)).toBeCloseTo(
      SHELL.cooldown * PICKUP.overdriveFireCooldownMultiplier,
    );

    stepPlayerStatus(player, PICKUP.overdriveDuration);
    expect(player.overdriveRemaining).toBe(0);
    expect(playerMovement(player).maxSpeed).toBe(TANK.maxSpeed);
    expect(effectiveFireCooldown(player)).toBe(SHELL.cooldown);
  });
});
