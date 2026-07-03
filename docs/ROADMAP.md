# Tankz — Roadmap & Improvement Ideas

A running list of possible additions for the proof-of-concept, roughly ordered
from "quick win" to "bigger project". Each item notes the main file(s) it would
touch so it's easy to pick one up.

## Done

- ✅ **Sound effects** — engine rumble (revs while driving), firing thoomp, and
  metallic hit ping. All synthesized live with the Web Audio API, so there are
  no audio files to ship. *File: `audio.js`, wired in `main.js`.*
- ✅ **Shot juice** — muzzle flash (real point light), barrel recoil + muzzle
  climb, muzzle smoke, camera shake (on fire + lighter on hit), and a crosshair
  that blooms on fire. *Files: `tank.js`, `projectile.js`, `main.js`.*
- ✅ **Reload indicator** — bottom-centre bar that refills over `FIRE_COOLDOWN`;
  the crosshair also dims/reddens while reloading. *Files: `index.html`, `main.js`.*
- ✅ **Drive dust** — puffs kicked up behind the tracks while moving, reusing the
  smoke particle system. *Files: `projectile.js`, `tank.js`, `main.js`.*

## Quick wins (an evening each)

- **Tune-ability** — pull speeds, cooldown, colours into a single `config.js` so
  values are easy to experiment with. *Files: new `config.js`.*

## Gameplay (a weekend each)

- **Tank health + destruction** — give the player and targets HP; explode on
  death. Adds real stakes. *Files: `tank.js`, `world.js`.*
- **Enemy tanks with simple AI** — turret tracks the player, drives toward/away,
  fires on a timer and line-of-sight. Even dumb AI is fun. *Files: new `enemy.js`.*
- **Score, waves & game-over screen** — spawn waves of enemies, track a score,
  show a restart overlay. *Files: `main.js`, `index.html`.*
- **Pickups** — health packs, rapid-fire, shield crates on the map. *Files: `world.js`.*
- **Minimap** — a small top-down 2D canvas showing tank + enemies + crates.
  *Files: `index.html`, new `minimap.js`.*

## Bigger / structural

- **Physics-ish movement** — acceleration, momentum, and turning that scales with
  speed instead of instant velocity. *Files: `tank.js`.*
- **Better collision** — swap the box tests for a small library (e.g. a 2D
  physics engine) if interactions get complex. *Files: `tank.js`, `projectile.js`.*
- **Destructible cover** — crates that take damage and break apart. *Files: `world.js`.*
- **Model & texture upgrade** — replace primitive geometry with a glTF tank model
  loaded via `GLTFLoader`; add ground textures. *Files: `tank.js`, `world.js`.*
- **Mobile/touch controls** — on-screen joystick + fire button. *Files: new `touch.js`.*
- **Gamepad support** — read the Gamepad API in the input layer. *Files: `input.js`.*

## "Someday" — back toward the Tanki Online inspiration

- **Local split-screen or hotseat** — two tanks, two viewports.
- **Real multiplayer** — the big one. Would need a server (WebSocket), state
  sync, and client-side prediction. A separate project in spirit.

## Known rough edges in the PoC

- Targets respawn via `setTimeout`, which keeps running even if the game is later
  paused — fine for now, but a proper game timer would be cleaner.
- Collision treats the tank as a circle and obstacles as axis-aligned boxes, so
  contact isn't pixel-perfect (good enough for arcade feel).
- No pause state or menu; the loop starts immediately on load.
