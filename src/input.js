import * as THREE from 'three';

/**
 * Input helper: tracks which keys are held, where the mouse is aiming on the
 * ground, and fires a callback when the player clicks to shoot.
 *
 * Games read input as *state* ("is W currently down?") rather than reacting to
 * one-off key events, because movement needs to happen every frame for as long
 * as the key is held. So we just record keydown/keyup into a Set and let the
 * game loop query it.
 */
export class Input {
  constructor(renderer, camera) {
    this.camera = camera;
    this.keys = new Set();
    this.aimPoint = null;      // THREE.Vector3 on the ground, or null
    this.onFire = null;        // set by main.js
    this.onReset = null;

    // Raycaster projects the 2D mouse position into the 3D world so we can
    // find where the cursor "touches" the ground plane (y = 0).
    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const dom = renderer.domElement;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.onReset?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    dom.addEventListener('mousemove', (e) => this.#updateAim(e));
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.onFire?.();
    });

    // If the tab loses focus, drop all keys so the tank doesn't "run away".
    window.addEventListener('blur', () => this.keys.clear());
  }

  isDown(code) {
    return this.keys.has(code);
  }

  #updateAim(e) {
    // Convert pixel coords → normalized device coords (-1..1), y flipped.
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const hit = new THREE.Vector3();
    // Where does the ray from the camera pierce the ground plane?
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      this.aimPoint = hit;
    }

    // Move the DOM crosshair to the cursor.
    const cross = document.getElementById('crosshair');
    if (cross) cross.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }
}
