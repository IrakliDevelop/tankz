/**
 * Input helper: tracks which keys are held and fires a callback on reset.
 *
 * Games read input as *state* ("is W currently down?") rather than reacting to
 * one-off key events, because movement needs to happen every frame for as long
 * as the key is held. So we just record keydown/keyup into a Set and let the
 * game loop query it. Firing is also polled from the loop (hold Space to keep
 * shooting, rate-limited by the reload cooldown).
 */

// Keys we handle ourselves — swallow their default browser behaviour (Space
// and the arrows would otherwise scroll the page).
const HANDLED = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.onReset = null;       // set by main.js

    window.addEventListener('keydown', (e) => {
      if (HANDLED.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.onReset?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // If the tab loses focus, drop all keys so the tank doesn't "run away".
    window.addEventListener('blur', () => this.keys.clear());
  }

  isDown(code) {
    return this.keys.has(code);
  }
}
