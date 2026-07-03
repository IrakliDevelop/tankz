import * as THREE from 'three';
import { World } from './world.js';
import { Tank } from './tank.js';
import { ProjectileSystem } from './projectile.js';
import { Input } from './input.js';
import { AudioManager } from './audio.js';

/**
 * main.js wires everything together and runs the game loop.
 *
 * Every real-time game boils down to the same loop, running ~60x/second:
 *   1. read input
 *   2. update the world by a small time step `dt`
 *   3. render the current state
 * requestAnimationFrame gives us that loop, synced to the monitor's refresh.
 */

// ---------- Renderer / scene / camera (the "three big objects") ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 60, 130);

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 500
);

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0x9fbfff, 0x202830, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -60;
sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;
sun.shadow.camera.bottom = -60;
sun.shadow.camera.far = 150;
scene.add(sun);

// ---------- Game objects ----------
const world = new World(scene);
const tank = new Tank(scene);
const projectiles = new ProjectileSystem(scene, world);
const input = new Input(renderer, camera);
const audio = new AudioManager();

// ---------- HUD state ----------
let score = 0;
let shots = 0;
const scoreEl = document.getElementById('score');
const shotsEl = document.getElementById('shots');

// ---------- Firing (rate-limited) ----------
let lastShot = -Infinity;
const FIRE_COOLDOWN = 0.28; // seconds between shots
let elapsed = 0;

input.onFire = () => {
  if (elapsed - lastShot < FIRE_COOLDOWN) return;
  lastShot = elapsed;
  const { position, direction } = tank.getMuzzle();
  projectiles.spawn(position, direction);
  audio.fire();
  shots++;
  shotsEl.textContent = shots;
};

input.onReset = () => tank.reset();

// ---------- Chase camera ----------
// The camera smoothly trails behind and above the hull. `lerp` (linear
// interpolation) each frame gives that springy, non-rigid follow feel.
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const a = tank.root.rotation.y;
  const back = 14, up = 9;
  const desired = new THREE.Vector3(
    tank.root.position.x - Math.sin(a) * back,
    up,
    tank.root.position.z - Math.cos(a) * back
  );
  // Frame-rate independent smoothing.
  const k = 1 - Math.pow(0.001, dt);
  camera.position.lerp(desired, k);

  camTarget.lerp(tank.root.position, k);
  camera.lookAt(camTarget.x, 1.5, camTarget.z);
}

// ---------- The loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);

  // dt = seconds since last frame. Clamp it so a background tab that was
  // paused doesn't produce a giant jump when it resumes.
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  tank.update(dt, input, world.obstacles);
  projectiles.update(dt, () => {
    score++;
    scoreEl.textContent = score;
    audio.hit();
  });
  updateCamera(dt);

  // Drive the engine sound: full intensity whenever any movement key is held.
  const moving = input.isDown('KeyW') || input.isDown('KeyS') ||
                 input.isDown('KeyA') || input.isDown('KeyD');
  audio.setEngineIntensity(moving ? 1 : 0);
  audio.update();

  renderer.render(scene, camera);
}

// Place the camera behind the tank before the first frame so it doesn't
// swoop in from the origin.
camera.position.set(0, 9, -14);
camTarget.copy(tank.root.position);
frame();

// ---------- Keep it responsive to window resizing ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
