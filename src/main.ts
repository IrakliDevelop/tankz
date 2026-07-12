import { Application } from 'pixi.js';
import { createSim, stepSim } from './core/sim';
import { SIM_DT } from './core/config';
import type { InputIntent } from './core/input';
import { Camera } from './view/camera';
import { Renderer } from './view/renderer';

/**
 * The classic fixed-timestep loop:
 *   - the sim advances in exact SIM_DT increments (deterministic),
 *   - rendering happens every animation frame, interpolating between the
 *     last two sim states by the accumulator remainder (smooth at any Hz).
 */
async function start(): Promise<void> {
  const app = new Application();
  await app.init({ resizeTo: window, background: 0x0b0e13, antialias: true });
  document.body.appendChild(app.canvas);

  // ---- Raw input state (view side; the sim only ever sees InputIntent) ----
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear()); // don't get stuck driving on alt-tab

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('pointerdown', (e) => { if (e.button === 0) mouse.down = true; });
  window.addEventListener('pointerup', (e) => { if (e.button === 0) mouse.down = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- World ----
  const state = createSim();
  const camera = new Camera();
  app.stage.addChild(camera.world);
  const renderer = new Renderer(camera.world, state);
  camera.update(state.tank.pos, app.screen.width, app.screen.height, SIM_DT); // initial snap
  renderer.render(state, 0);

  function readIntent(): InputIntent {
    const throttle = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const steer = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    return {
      throttle,
      steer,
      aimPoint: camera.toWorld(mouse.x, mouse.y),
      fire: mouse.down,
    };
  }

  // ---- Fixed-timestep accumulator, clamped so a suspended tab can't spiral ----
  const MAX_STEPS_PER_FRAME = 5;
  let accumulator = 0;
  app.ticker.add((ticker) => {
    accumulator = Math.min(accumulator + ticker.deltaMS / 1000, MAX_STEPS_PER_FRAME * SIM_DT);
    while (accumulator >= SIM_DT) {
      renderer.beginStep(state);
      stepSim(state, readIntent());
      accumulator -= SIM_DT;
    }
    camera.update(state.tank.pos, app.screen.width, app.screen.height, ticker.deltaMS / 1000);
    renderer.render(state, accumulator / SIM_DT);
  });
}

start().catch((err: unknown) => {
  // A visible failure beats a silent black page.
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:#ff6b5b;padding:24px;font:14px ui-monospace,monospace;white-space:pre-wrap';
  pre.textContent = `Tankz failed to start:\n\n${err instanceof Error ? err.stack ?? err.message : String(err)}`;
  document.body.appendChild(pre);
  console.error(err);
});
