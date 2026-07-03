import * as THREE from 'three';
import { World } from './world';
import { Tank } from './tank';
import { Enemy } from './enemy';
import { ProjectileSystem } from './projectile';
import { Input } from './input';
import { AudioManager } from './audio';
import type { Combatant } from './types';

/**
 * main.ts wires everything together and runs the game loop.
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
const input = new Input();
const audio = new AudioManager();

// A small squad of enemies, parked at spawn points around the arena edge.
const ENEMY_COUNT = 4;
const enemies: Enemy[] = [];
for (let i = 0; i < ENEMY_COUNT; i++) enemies.push(new Enemy(scene));
// Dead enemies wait this long, then redeploy at a fresh spawn point.
const RESPAWN_DELAY = 4;

// The list of things a shell can hit: the player plus every enemy.
const combatants: Combatant[] = [tank, ...enemies];

// ---------- HUD state ----------
// The `!` asserts these elements exist — they're declared in index.html.
let score = 0;
let shots = 0;
let gameOver = false;
const scoreEl = document.getElementById('score')!;
const shotsEl = document.getElementById('shots')!;
const healthFillEl = document.getElementById('healthFill')!;
const gameoverEl = document.getElementById('gameover')!;

/**
 * Move an enemy to a spawn point that's far from the player (so it doesn't pop
 * in your face) but also away from the other enemies (so they don't stack up).
 */
function deployEnemy(enemy: Enemy): void {
  let best: number[] = world.spawnPoints[0], bestScore = -Infinity;
  for (const [x, z] of world.spawnPoints) {
    const dPlayer = Math.hypot(x - tank.root.position.x, z - tank.root.position.z);
    let dOthers = Infinity;
    for (const o of enemies) {
      if (o === enemy || !o.alive) continue;
      dOthers = Math.min(dOthers, Math.hypot(x - o.root.position.x, z - o.root.position.z));
    }
    // Favour distance from the player, but penalise crowding onto a neighbour.
    const score = dPlayer + Math.min(dOthers, 20);
    if (score > bestScore) { bestScore = score; best = [x, z]; }
  }
  enemy.spawnAt(best[0], best[1]);
}
enemies.forEach(deployEnemy);

// ---------- Screen shake ----------
// `trauma` rises on impactful events and decays every frame. We square it when
// applying, so small trauma is barely felt but a fresh shot really jolts —
// a trick from Vlambeer's "juice" talks. Positional jitter on the camera.
let trauma = 0;
const addShake = (amount: number) => { trauma = Math.min(1, trauma + amount); };

// ---------- Firing (rate-limited) ----------
let lastShot = -Infinity;
const FIRE_COOLDOWN = 0.28; // seconds between shots
let elapsed = 0;
let crosshairKick = 0;      // 1 on fire, decays — makes the crosshair bloom

// Polled from the game loop while Space is held; the cooldown gates the rate.
function tryFire() {
  if (gameOver || elapsed - lastShot < FIRE_COOLDOWN) return;
  lastShot = elapsed;
  const { position, direction } = tank.getMuzzle();
  projectiles.spawn(position, direction, { team: 'player', damage: 20 });
  audio.fire();
  tank.kick();          // barrel recoil + muzzle climb
  addShake(0.32);       // camera jolt
  crosshairKick = 1;    // crosshair bloom
  shots++;
  shotsEl.textContent = String(shots);
}

// R redeploys the whole battle: heal the player, respawn every enemy, zero
// the score. Used both mid-game and to restart after being destroyed.
function resetGame(): void {
  tank.reset();
  enemies.forEach(deployEnemy);
  score = 0; shots = 0;
  scoreEl.textContent = String(score);
  shotsEl.textContent = String(shots);
  gameOver = false;
  gameoverEl.hidden = true;
}
input.onReset = resetGame;

// ---------- Chase camera ----------
// The camera smoothly trails behind and above the TURRET (Tanki-style): it
// swings with Z/X but stays put when you only steer the hull. `lerp` (linear
// interpolation) each frame gives that springy, non-rigid follow feel.
const camTarget = new THREE.Vector3();
function updateCamera(dt: number): void {
  const a = tank.getTurretWorldAngle();
  const back = 14, up = 9;
  const desired = new THREE.Vector3(
    tank.root.position.x - Math.sin(a) * back,
    up,
    tank.root.position.z - Math.cos(a) * back
  );
  // Frame-rate independent smoothing.
  const k = 1 - Math.pow(0.001, dt);
  camera.position.lerp(desired, k);

  // Apply shake as a random positional offset *before* lookAt, so both the
  // position and the resulting view direction wobble. trauma^2 = punchy falloff.
  trauma = Math.max(0, trauma - dt * 1.8);
  const s = trauma * trauma * 1.4;
  camera.position.x += (Math.random() - 0.5) * s;
  camera.position.y += (Math.random() - 0.5) * s;
  camera.position.z += (Math.random() - 0.5) * s;

  camTarget.lerp(tank.root.position, k);
  camera.lookAt(camTarget.x, 1.5, camTarget.z);
}

// ---------- HUD: crosshair + reload bar ----------
const crosshairEl = document.getElementById('crosshair')!;
const reloadFillEl = document.getElementById('reloadFill')!;
function updateHud(dt: number): void {
  // Player armor bar: fill by HP fraction, redden as it gets low.
  const hpFrac = Math.max(0, tank.hp / tank.maxHp);
  healthFillEl.style.width = `${(hpFrac * 100).toFixed(0)}%`;
  healthFillEl.style.background = hpFrac > 0.5
    ? 'linear-gradient(90deg, #56d364, #8ec5ff)'
    : hpFrac > 0.25 ? '#e3b341' : '#ff6b5b';

  // Reload progress 0..1 since the last shot.
  const ready = Math.min(1, (elapsed - lastShot) / FIRE_COOLDOWN);
  reloadFillEl.style.width = `${(ready * 100).toFixed(0)}%`;
  reloadFillEl.style.background = ready >= 1 ? '#7cfca0' : '#ffb347';

  // Crosshair: fixed at screen centre now that the turret always aims "into"
  // the view. It blooms outward right after firing and goes amber/dim while
  // the gun is still reloading (a clear "can't shoot yet" cue).
  crosshairKick = Math.max(0, crosshairKick - dt * 4);
  const scale = 1 + crosshairKick * 0.7;
  crosshairEl.style.transform =
    `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px) scale(${scale})`;
  crosshairEl.style.opacity = ready >= 1 ? '1' : '0.45';
  crosshairEl.style.borderColor = ready >= 1
    ? 'rgba(142, 197, 255, 0.9)'
    : 'rgba(255, 160, 80, 0.8)';
}

// ---------- Combat events ----------
// An enemy takes a shot at the player. We add a little random spread to the
// aim so enemies aren't pinpoint snipers — that's what makes them dodgeable.
function fireEnemy(enemy: Enemy): void {
  const { position, direction } = enemy.getMuzzle();
  const spread = 0.06; // radians
  const ang = Math.atan2(direction.x, direction.z) + (Math.random() - 0.5) * 2 * spread;
  const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
  projectiles.spawn(position, dir, { team: 'enemy', damage: 8, speed: 42 });
  audio.enemyFire();
}

// Called by the projectile system whenever a shell lands on a tank.
function onShellHit(combatant: Combatant, killed: boolean): void {
  if (!killed) {
    audio.hit();
    // A bigger jolt when *you* get hit, so damage really registers.
    addShake(combatant.team === 'player' ? 0.4 : 0.12);
    return;
  }

  // Something was destroyed.
  audio.explosion();
  projectiles.explode(combatant.root.position.clone().setY(1.2));
  addShake(0.5);

  // `instanceof` narrows the Combatant to a concrete Enemy so we can reach its
  // enemy-only `diedAt` field type-safely.
  if (combatant instanceof Enemy) {
    combatant.diedAt = elapsed;      // start the respawn countdown
    score++;
    scoreEl.textContent = String(score);
  } else {
    // The player died → game over.
    gameOver = true;
    gameoverEl.hidden = false;
  }
}

// ---------- Drive dust ----------
// Kick up a puff behind the tracks a few times a second while moving.
let dustTimer = 0;

// ---------- The loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);

  // dt = seconds since last frame. Clamp it so a background tab that was
  // paused doesn't produce a giant jump when it resumes.
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (!gameOver) {
    if (input.isDown('Space')) tryFire();  // hold to auto-fire (cooldown-gated)

    tank.update(dt, input, world.obstacles);

    // Enemy AI: each live one thinks & moves; dead ones wait to redeploy.
    for (const e of enemies) {
      if (e.alive) {
        const wantsToFire = e.update(dt, tank, world.obstacles, elapsed);
        if (wantsToFire) fireEnemy(e);
      } else if (elapsed - e.diedAt > RESPAWN_DELAY) {
        deployEnemy(e);
      }
    }
  }

  // Shells still fly & fade even during the game-over freeze (looks nicer).
  projectiles.update(dt, combatants, onShellHit);

  updateCamera(dt);
  updateHud(dt);

  // Drive the engine sound: full intensity whenever any movement key is held.
  const moving = !gameOver && (
    input.isDown('KeyW') || input.isDown('KeyS') ||
    input.isDown('KeyA') || input.isDown('KeyD') ||
    input.isDown('ArrowUp') || input.isDown('ArrowDown') ||
    input.isDown('ArrowLeft') || input.isDown('ArrowRight'));
  audio.setEngineIntensity(moving ? 1 : 0);
  audio.update();

  // Drive dust: emit a couple of puffs per second behind the tracks.
  if (moving) {
    dustTimer += dt;
    if (dustTimer >= 0.07) {
      dustTimer = 0;
      for (const pt of tank.getExhaustPoints()) {
        projectiles.smoke(pt, {
          count: 1, color: 0x6b5a44, size: 0.45, rise: 0.7, spread: 0.5, life: 0.6,
        });
      }
    }
  } else {
    dustTimer = 0;
  }

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
