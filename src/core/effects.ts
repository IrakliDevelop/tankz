import type { EntityId, Vec2 } from './types';
import { EFFECT } from './config';

export type EffectKind = 'impact' | 'explosion' | 'repair' | 'shield' | 'overdrive';

export interface EffectState {
  id: EntityId;
  kind: EffectKind;
  pos: Vec2;
  age: number;
  life: number;
}

export function createEffect(id: EntityId, kind: EffectKind, pos: Vec2): EffectState {
  const life =
    kind === 'impact'
      ? EFFECT.impactLife
      : kind === 'explosion'
        ? EFFECT.explosionLife
        : kind === 'repair'
          ? EFFECT.repairLife
          : kind === 'shield'
            ? EFFECT.shieldLife
            : EFFECT.overdriveLife;
  return { id, kind, pos: { x: pos.x, y: pos.y }, age: 0, life };
}

export function stepEffects(effects: EffectState[], dt: number): void {
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].age += dt;
    if (effects[i].age >= effects[i].life) effects.splice(i, 1);
  }
}
