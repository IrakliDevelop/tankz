import type { EntityId, Vec2 } from './types';
import type { PlayerState } from './player';
import { PICKUP } from './config';
import { randomUnit, type RngSource } from './rng';

export type PickupKind = 'repair' | 'shield' | 'overdrive';

export interface PickupState {
  id: EntityId;
  kind: PickupKind;
  pos: Vec2;
}

export interface CollectedPickup {
  kind: PickupKind;
  pos: Vec2;
}

export function createPickup(id: EntityId, kind: PickupKind, pos: Vec2): PickupState {
  return { id, kind, pos: { x: pos.x, y: pos.y } };
}

export function rollPickupKind(
  source: RngSource,
  wave: number,
  armorRatio: number,
): PickupKind | null {
  const dropChance = Math.min(
    PICKUP.maxDropChance,
    PICKUP.dropChance + (wave - 1) * PICKUP.dropChancePerWave,
  );
  if (randomUnit(source) >= dropChance) return null;

  const repairWeight =
    PICKUP.repairWeight *
    (armorRatio <= PICKUP.repairLowArmorRatio ? PICKUP.repairLowArmorWeightMultiplier : 1);
  const shieldWeight = wave >= PICKUP.shieldUnlockWave ? PICKUP.shieldWeight : 0;
  const overdriveWeight = wave >= PICKUP.overdriveUnlockWave ? PICKUP.overdriveWeight : 0;
  const roll = randomUnit(source) * (repairWeight + shieldWeight + overdriveWeight);
  if (roll < repairWeight) return 'repair';
  if (roll < repairWeight + shieldWeight) return 'shield';
  return 'overdrive';
}

/** Applies and removes usable pickups, returning data needed for read-only effects. */
export function collectPickups(pickups: PickupState[], player: PlayerState): CollectedPickup[] {
  const collected: CollectedPickup[] = [];
  const radiusSq = PICKUP.collectRadius * PICKUP.collectRadius;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    const dx = pickup.pos.x - player.body.pos.x;
    const dy = pickup.pos.y - player.body.pos.y;
    if (dx * dx + dy * dy > radiusSq || !canUse(pickup.kind, player)) continue;

    applyPickup(pickup.kind, player);
    collected.push({
      kind: pickup.kind,
      pos: { x: pickup.pos.x, y: pickup.pos.y },
    });
    pickups.splice(i, 1);
  }
  return collected;
}

function canUse(kind: PickupKind, player: PlayerState): boolean {
  if (kind === 'repair') return player.hp < player.maxHp;
  if (kind === 'shield') return player.shield < player.maxShield;
  return true;
}

function applyPickup(kind: PickupKind, player: PlayerState): void {
  if (kind === 'repair') {
    player.hp = Math.min(player.maxHp, player.hp + PICKUP.repairAmount);
  } else if (kind === 'shield') {
    player.shield = Math.min(player.maxShield, player.shield + PICKUP.shieldAmount);
  } else {
    player.overdriveRemaining = PICKUP.overdriveDuration;
  }
}
