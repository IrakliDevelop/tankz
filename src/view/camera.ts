import { Container } from 'pixi.js';
import type { Vec2 } from '../core/types';

/** The world container; moving it opposite to the target scrolls the view. */
export class Camera {
  readonly world = new Container();
  private initialized = false;

  update(target: Vec2, screenW: number, screenH: number, dt: number): void {
    const desiredX = screenW / 2 - target.x;
    const desiredY = screenH / 2 - target.y;
    if (!this.initialized) {
      // Snap on the first frame so the camera doesn't swoop in from the origin.
      this.world.position.set(desiredX, desiredY);
      this.initialized = true;
      return;
    }
    // Frame-rate independent smoothing.
    const k = 1 - Math.pow(0.001, dt);
    this.world.x += (desiredX - this.world.x) * k;
    this.world.y += (desiredY - this.world.y) * k;
  }

  /** Screen (client) coordinates → world coordinates. */
  toWorld(screenX: number, screenY: number): Vec2 {
    return { x: screenX - this.world.x, y: screenY - this.world.y };
  }
}
