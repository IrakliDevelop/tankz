import { Application } from 'pixi.js';
import { createSim, stepSim } from './core/sim';
import { SIM_DT } from './core/config';
import type { InputIntent } from './core/input';
import { AudioManager } from './view/audio';
import { Camera } from './view/camera';
import { Hud } from './view/hud';
import { Renderer } from './view/renderer';

/**
 * Fixed-step simulation with an interpolated Pixi view. Browser input is
 * translated into serializable intent at the boundary and never leaks inward.
 */
async function start(): Promise<void> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: 0x0b0d0b,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio, 2),
  });
  app.canvas.setAttribute(
    'aria-label',
    'Tankz game arena. Use W and S to drive, A and D to steer, mouse to aim, click to fire, and M to toggle sound.',
  );
  document.body.appendChild(app.canvas);

  const state = createSim(Date.now() >>> 0);
  const audio = new AudioManager(state);
  const hud = new Hud();
  const camera = new Camera();
  app.stage.addChild(camera.world);
  const renderer = new Renderer(camera.world, state);

  const keys = new Set<string>();
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    down: false,
  };
  let queuedUpgrade: number | null = null;
  let queuedRestart = false;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
      if (!event.repeat) audio.toggle();
      event.preventDefault();
      return;
    }
    void audio.unlock();
    keys.add(event.code);
    if (!event.repeat && event.code.startsWith('Digit')) {
      const index = Number(event.code.slice(5)) - 1;
      if (index >= 0 && index < 3) queuedUpgrade = index;
    }
    if (!event.repeat && (event.code === 'KeyR' || event.code === 'Enter')) {
      queuedRestart = true;
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    hud.setPointer(mouse.x, mouse.y);
  });
  window.addEventListener('pointerdown', (event) => {
    if (event.target !== app.canvas) return;
    void audio.unlock();
    if (event.button === 0 && event.target === app.canvas) mouse.down = true;
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  window.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });
  hud.choiceButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      queuedUpgrade = index;
    });
  });

  camera.update(state.players[0].body.pos, app.screen.width, app.screen.height, SIM_DT);
  renderer.render(state, 0);
  hud.setPointer(mouse.x, mouse.y);
  hud.update(state);

  function readIntent(): InputIntent {
    const intent: InputIntent = {
      throttle: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
      steer: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
      aimPoint: camera.toWorld(mouse.x, mouse.y),
      fire: mouse.down,
      upgradeChoice: queuedUpgrade,
      restart: queuedRestart,
    };
    queuedUpgrade = null;
    queuedRestart = false;
    return intent;
  }

  const maxStepsPerFrame = 5;
  let accumulator = 0;
  app.ticker.add((ticker) => {
    accumulator = Math.min(accumulator + ticker.deltaMS / 1000, maxStepsPerFrame * SIM_DT);
    while (accumulator >= SIM_DT) {
      renderer.beginStep(state);
      stepSim(state, readIntent());
      accumulator -= SIM_DT;
    }

    const alpha = accumulator / SIM_DT;
    camera.update(
      renderer.playerRenderPos(state, alpha),
      app.screen.width,
      app.screen.height,
      ticker.deltaMS / 1000,
    );
    audio.update(state);
    renderer.render(state, alpha);
    hud.update(state);
  });
}

start().catch((error: unknown) => {
  const pre = document.createElement('pre');
  pre.style.cssText =
    'color:#ff6b5b;padding:24px;font:14px ui-monospace,monospace;white-space:pre-wrap';
  pre.textContent =
    'Tankz failed to start:\n\n' +
    (error instanceof Error ? (error.stack ?? error.message) : String(error));
  document.body.appendChild(pre);
  console.error(error);
});
