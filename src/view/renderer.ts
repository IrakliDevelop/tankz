import { Container } from 'pixi.js';
import type { TankState } from '../core/tank';
import type { SimState } from '../core/sim';
import type { EntityId, Vec2 } from '../core/types';
import { lerp, lerpAngle } from '../core/physics';
import {
  makeArenaVisual,
  makeEffectVisual,
  makePickupVisual,
  makeShellVisual,
  makeTankVisual,
  type TankVisual,
} from './visuals';

interface BodySnapshot {
  x: number;
  y: number;
  hullAngle: number;
  turretAngle: number;
}

/**
 * Mirrors sim state into Pixi display objects. The sim steps at a fixed rate;
 * render() interpolates entity transforms without ever mutating gameplay state.
 */
export class Renderer {
  private readonly actorLayer = new Container({ sortableChildren: true });
  private readonly pickupLayer = new Container();
  private readonly shellLayer = new Container();
  private readonly effectLayer = new Container();
  private readonly playerVisual: TankVisual;
  private readonly enemyVisuals = new Map<EntityId, TankVisual>();
  private readonly shellVisuals = new Map<EntityId, Container>();
  private readonly pickupVisuals = new Map<EntityId, Container>();
  private readonly effectVisuals = new Map<EntityId, Container>();
  private arenaVisual: Container;
  private arenaRevision: number;
  private prevPlayer: BodySnapshot;
  private readonly prevEnemies = new Map<EntityId, BodySnapshot>();
  private readonly prevShells = new Map<EntityId, Vec2>();

  constructor(
    private readonly world: Container,
    state: SimState,
  ) {
    this.arenaVisual = makeArenaVisual(state.arena);
    this.arenaRevision = state.arenaRevision;
    world.addChild(
      this.arenaVisual,
      this.pickupLayer,
      this.actorLayer,
      this.shellLayer,
      this.effectLayer,
    );
    this.playerVisual = makeTankVisual('player');
    this.actorLayer.addChild(this.playerVisual.root);
    this.prevPlayer = snapshotBody(state.players[0].body);
  }

  /** Capture fixed-step transforms immediately before the simulation advances. */
  beginStep(state: SimState): void {
    this.prevPlayer = snapshotBody(state.players[0].body);
    this.prevEnemies.clear();
    for (const enemy of state.enemies) {
      this.prevEnemies.set(enemy.id, snapshotBody(enemy.body));
    }
    this.prevShells.clear();
    for (const shell of state.shells) {
      this.prevShells.set(shell.id, {
        x: shell.pos.x,
        y: shell.pos.y,
      });
    }
  }

  playerRenderPos(state: SimState, alpha: number): Vec2 {
    const player = state.players[0];
    return {
      x: lerp(this.prevPlayer.x, player.body.pos.x, alpha),
      y: lerp(this.prevPlayer.y, player.body.pos.y, alpha),
    };
  }

  render(state: SimState, alpha: number): void {
    this.syncArena(state);
    this.renderPlayer(state, alpha);
    this.renderEnemies(state, alpha);
    this.renderShells(state, alpha);
    this.renderPickups(state);
    this.renderEffects(state);
  }

  private syncArena(state: SimState): void {
    if (state.arenaRevision === this.arenaRevision) return;
    const nextArena = makeArenaVisual(state.arena);
    this.world.addChildAt(nextArena, 0);
    this.world.removeChild(this.arenaVisual);
    this.arenaVisual.destroy({ children: true });
    this.arenaVisual = nextArena;
    this.arenaRevision = state.arenaRevision;
    this.prevPlayer = snapshotBody(state.players[0].body);
  }

  private renderPlayer(state: SimState, alpha: number): void {
    const player = state.players[0];
    const pos = this.playerRenderPos(state, alpha);
    this.playerVisual.root.position.set(pos.x, pos.y);
    this.playerVisual.root.zIndex = pos.y;
    this.playerVisual.hull.rotation = lerpAngle(
      this.prevPlayer.hullAngle,
      player.body.hullAngle,
      alpha,
    );
    this.playerVisual.turret.rotation = lerpAngle(
      this.prevPlayer.turretAngle,
      player.body.turretAngle,
      alpha,
    );
    this.playerVisual.shield.visible = player.shield > 0;
    this.playerVisual.shield.alpha = 0.42 + Math.sin(state.elapsed * 6) * 0.12;
    this.playerVisual.overdrive.visible = player.overdriveRemaining > 0;
    this.playerVisual.overdrive.rotation = -state.elapsed * 1.4;
    setHealth(this.playerVisual, player.hp, player.maxHp);
  }

  private renderEnemies(state: SimState, alpha: number): void {
    const live = new Set<EntityId>();
    for (const enemy of state.enemies) {
      live.add(enemy.id);
      let visual = this.enemyVisuals.get(enemy.id);
      if (!visual) {
        visual = makeTankVisual(enemy.kind);
        this.enemyVisuals.set(enemy.id, visual);
        this.actorLayer.addChild(visual.root);
      }
      const previous = this.prevEnemies.get(enemy.id) ?? snapshotBody(enemy.body);
      const x = lerp(previous.x, enemy.body.pos.x, alpha);
      const y = lerp(previous.y, enemy.body.pos.y, alpha);
      visual.root.position.set(x, y);
      visual.root.zIndex = y;
      visual.hull.rotation = lerpAngle(previous.hullAngle, enemy.body.hullAngle, alpha);
      visual.turret.rotation = lerpAngle(previous.turretAngle, enemy.body.turretAngle, alpha);
      setHealth(visual, enemy.hp, enemy.maxHp);
    }
    for (const [id, visual] of this.enemyVisuals) {
      if (live.has(id)) continue;
      visual.root.destroy({ children: true });
      this.enemyVisuals.delete(id);
    }
  }

  private renderShells(state: SimState, alpha: number): void {
    const live = new Set<EntityId>();
    for (const shell of state.shells) {
      live.add(shell.id);
      let visual = this.shellVisuals.get(shell.id);
      if (!visual) {
        visual = makeShellVisual(shell.team);
        this.shellVisuals.set(shell.id, visual);
        this.shellLayer.addChild(visual);
      }
      const previous = this.prevShells.get(shell.id) ?? shell.pos;
      visual.position.set(
        lerp(previous.x, shell.pos.x, alpha),
        lerp(previous.y, shell.pos.y, alpha),
      );
    }
    for (const [id, visual] of this.shellVisuals) {
      if (live.has(id)) continue;
      visual.destroy({ children: true });
      this.shellVisuals.delete(id);
    }
  }

  private renderPickups(state: SimState): void {
    const live = new Set<EntityId>();
    for (const pickup of state.pickups) {
      live.add(pickup.id);
      let visual = this.pickupVisuals.get(pickup.id);
      if (!visual) {
        visual = makePickupVisual(pickup.kind);
        this.pickupVisuals.set(pickup.id, visual);
        this.pickupLayer.addChild(visual);
      }
      visual.position.set(pickup.pos.x, pickup.pos.y + Math.sin(state.elapsed * 4 + pickup.id) * 3);
      visual.rotation = state.elapsed * 1.2;
    }
    for (const [id, visual] of this.pickupVisuals) {
      if (live.has(id)) continue;
      visual.destroy({ children: true });
      this.pickupVisuals.delete(id);
    }
  }

  private renderEffects(state: SimState): void {
    const live = new Set<EntityId>();
    for (const effect of state.effects) {
      live.add(effect.id);
      let visual = this.effectVisuals.get(effect.id);
      if (!visual) {
        visual = makeEffectVisual(effect.kind);
        visual.position.set(effect.pos.x, effect.pos.y);
        this.effectVisuals.set(effect.id, visual);
        this.effectLayer.addChild(visual);
      }
      const progress = effect.age / effect.life;
      const scale = effect.kind === 'explosion' ? 0.55 + progress : 0.8 + progress * 0.4;
      visual.scale.set(scale);
      visual.alpha = 1 - progress;
    }
    for (const [id, visual] of this.effectVisuals) {
      if (live.has(id)) continue;
      visual.destroy({ children: true });
      this.effectVisuals.delete(id);
    }
  }
}

function setHealth(visual: TankVisual, hp: number, maxHp: number): void {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  visual.healthFill.scale.x = ratio;
  visual.health.visible = ratio < 1;
}

function snapshotBody(body: TankState): BodySnapshot {
  return {
    x: body.pos.x,
    y: body.pos.y,
    hullAngle: body.hullAngle,
    turretAngle: body.turretAngle,
  };
}
