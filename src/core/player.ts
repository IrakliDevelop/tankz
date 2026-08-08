import type { EntityId, Vec2 } from './types';
import type { TankMovement, TankState } from './tank';
import { createTank } from './tank';
import { PICKUP, SHELL, TANK, UPGRADE } from './config';
import type { RngSource } from './rng';
import { shuffledIndices } from './rng';

export const UPGRADE_KINDS = [
  'rapidFire',
  'highExplosive',
  'reinforcedArmor',
  'overdrive',
  'fieldRepair',
  'multishot',
] as const;

export type UpgradeKind = (typeof UPGRADE_KINDS)[number];

export const UPGRADE_INFO: Record<UpgradeKind, { name: string; description: string }> = {
  rapidFire: { name: 'Hair Trigger', description: 'Fire 22% faster. Stacks.' },
  highExplosive: { name: 'Hot Load', description: '+9 shell damage. Stacks.' },
  reinforcedArmor: { name: 'Welded Plate', description: '+28 max armor and repair 28.' },
  overdrive: { name: 'Nitro Treads', description: '+13% acceleration and speed.' },
  fieldRepair: { name: 'Field Repair', description: 'Restore 60 armor immediately.' },
  multishot: { name: 'Forked Barrel', description: 'Add a shell to every volley.' },
};

export interface PlayerState {
  id: EntityId;
  body: TankState;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  overdriveRemaining: number;
  cooldown: number;
  fireCooldown: number;
  shellDamage: number;
  shotCount: number;
  shotSpread: number;
  speedMultiplier: number;
  upgrades: Record<UpgradeKind, number>;
}

export function createPlayer(id: EntityId, pos: Vec2): PlayerState {
  return {
    id,
    body: createTank(pos.x, pos.y),
    hp: TANK.maxHp,
    maxHp: TANK.maxHp,
    shield: 0,
    maxShield: PICKUP.maxShield,
    overdriveRemaining: 0,
    cooldown: 0,
    fireCooldown: SHELL.cooldown,
    shellDamage: SHELL.damage,
    shotCount: 1,
    shotSpread: UPGRADE.multishotSpread,
    speedMultiplier: 1,
    upgrades: {
      rapidFire: 0,
      highExplosive: 0,
      reinforcedArmor: 0,
      overdrive: 0,
      fieldRepair: 0,
      multishot: 0,
    },
  };
}

export function playerMovement(player: PlayerState): TankMovement {
  const combatMultiplier = player.overdriveRemaining > 0 ? PICKUP.overdriveSpeedMultiplier : 1;
  const speedMultiplier = player.speedMultiplier * combatMultiplier;
  return {
    radius: TANK.radius,
    accel: TANK.accel * speedMultiplier,
    maxSpeed: TANK.maxSpeed * speedMultiplier,
    maxReverseSpeed: TANK.maxReverseSpeed * speedMultiplier,
    friction: TANK.friction,
    hullTurnRate: TANK.hullTurnRate,
    turretTurnRate: TANK.turretTurnRate,
  };
}

export function effectiveFireCooldown(player: PlayerState): number {
  return (
    player.fireCooldown *
    (player.overdriveRemaining > 0 ? PICKUP.overdriveFireCooldownMultiplier : 1)
  );
}

export function stepPlayerStatus(player: PlayerState, dt: number): void {
  player.overdriveRemaining = Math.max(0, player.overdriveRemaining - dt);
}

export function applyPlayerDamage(player: PlayerState, damage: number): void {
  const absorbed = Math.min(player.shield, damage);
  player.shield -= absorbed;
  player.hp -= damage - absorbed;
}

export function rollUpgradeChoices(source: RngSource): UpgradeKind[] {
  return shuffledIndices(source, UPGRADE_KINDS.length)
    .slice(0, 3)
    .map((index) => UPGRADE_KINDS[index]);
}

export function applyUpgrade(player: PlayerState, kind: UpgradeKind): void {
  player.upgrades[kind] += 1;
  switch (kind) {
    case 'rapidFire':
      player.fireCooldown *= UPGRADE.rapidFireMultiplier;
      break;
    case 'highExplosive':
      player.shellDamage += UPGRADE.damageBonus;
      break;
    case 'reinforcedArmor':
      player.maxHp += UPGRADE.armorBonus;
      player.hp = Math.min(player.maxHp, player.hp + UPGRADE.armorHeal);
      break;
    case 'overdrive':
      player.speedMultiplier *= UPGRADE.speedMultiplier;
      break;
    case 'fieldRepair':
      player.hp = Math.min(player.maxHp, player.hp + UPGRADE.repairAmount);
      break;
    case 'multishot':
      player.shotCount += 1;
      break;
  }
}
