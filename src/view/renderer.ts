import type { Container } from 'pixi.js';
import type { SimState } from '../core/sim';
import type { EntityId, Vec2 } from '../core/types';
import { lerp, lerpAngle } from '../core/physics';
import { makeArenaVisual, makeShellVisual, makeTankVisual, type TankVisual } from './visuals';

interface TankSnapshot { x: number; y: number; hullAngle: number; turretAngle: number; }

/**
 * Mirrors sim state into Pixi display objects. The sim steps at a fixed rate;
 * render() is called every frame with `alpha` = fraction of a step elapsed,
 * and draws each entity interpolated between its previous and current state.
 */
export class Renderer {
  private readonly world: Container;
  private readonly tankVisual: TankVisual;
  private readonly shellVisuals = new Map<EntityId, Container>();
  private prevTank: TankSnapshot;
  private readonly prevShells = new Map<EntityId, Vec2>();

  constructor(world: Container, state: SimState) {
    this.world = world;
    world.addChild(makeArenaVisual(state.arena));
    this.tankVisual = makeTankVisual();
    world.addChild(this.tankVisual.root);
    this.prevTank = snapshotTank(state);
  }

  /** Call immediately BEFORE each stepSim: captures the "previous" transforms. */
  beginStep(state: SimState): void {
    this.prevTank = snapshotTank(state);
    this.prevShells.clear();
    for (const s of state.shells) {
      this.prevShells.set(s.id, { x: s.pos.x, y: s.pos.y });
    }
  }

  /** The tank's interpolated world position for the current frame. */
  tankRenderPos(state: SimState, alpha: number): Vec2 {
    return {
      x: lerp(this.prevTank.x, state.tank.pos.x, alpha),
      y: lerp(this.prevTank.y, state.tank.pos.y, alpha),
    };
  }

  /** Call once per animation frame. alpha in [0,1) interpolates prev → current. */
  render(state: SimState, alpha: number): void {
    const t = state.tank;
    const p = this.tankRenderPos(state, alpha);
    this.tankVisual.root.position.set(p.x, p.y);
    this.tankVisual.hull.rotation = lerpAngle(this.prevTank.hullAngle, t.hullAngle, alpha);
    this.tankVisual.turret.rotation = lerpAngle(this.prevTank.turretAngle, t.turretAngle, alpha);

    // Shells: create visuals for new ones, move live ones, destroy dead ones.
    const live = new Set<EntityId>();
    for (const s of state.shells) {
      live.add(s.id);
      let visual = this.shellVisuals.get(s.id);
      if (!visual) {
        visual = makeShellVisual();
        this.shellVisuals.set(s.id, visual);
        this.world.addChild(visual);
      }
      const prev = this.prevShells.get(s.id) ?? s.pos; // brand-new shell: no prev yet
      visual.position.set(lerp(prev.x, s.pos.x, alpha), lerp(prev.y, s.pos.y, alpha));
    }
    for (const [id, visual] of this.shellVisuals) {
      if (!live.has(id)) {
        visual.destroy({ children: true });
        this.shellVisuals.delete(id);
      }
    }
  }
}

function snapshotTank(state: SimState): TankSnapshot {
  return {
    x: state.tank.pos.x,
    y: state.tank.pos.y,
    hullAngle: state.tank.hullAngle,
    turretAngle: state.tank.turretAngle,
  };
}
