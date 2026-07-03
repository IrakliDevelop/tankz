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
- ✅ **Tanki-style controls** — WASD/arrows drive the hull, Z/X rotate the turret,
  Space fires; camera follows the turret, not the hull. *Files: `tank.js`, `input.js`, `main.js`.*
- ✅ **Enemy tanks + HP + game over** — AI enemies (track/approach/circle/shoot),
  team-based projectile damage, player & enemy health, explosions, enemy respawn,
  armor bar, kills counter, and a DESTROYED/restart overlay.
  *Files: `enemy.ts`, `physics.ts`, `projectile.ts`, `tank.ts`, `world.ts`, `main.ts`, `index.html`.*
- ✅ **TypeScript migration** — all of `src/` is now strict TS; shared types in
  `types.ts`; `npm run typecheck` / `build` gate on `tsc`. See `ARCHITECTURE.md`
  for the stack + code-structure direction.

## Architecture / foundations (see ARCHITECTURE.md)

- **Composition refactor** — de-duplicate `Tank`/`Enemy` into composed parts
  (chassis, health, movement, weapon, AI brain). The recommended *next* step.
- **Separate simulation from rendering** — keep game logic Three/DOM-free so it's
  testable and could later run server-authoritative (Tanki is multiplayer).
- **Fixed-timestep loop**, **config module**, **game-state machine**, **object
  pooling** — see the priority list in `ARCHITECTURE.md`.
- **Physics engine (Rapier / cannon-es)** — deferred until tank-vs-tank / arcing
  shells / toppling props are wanted.

## Quick wins (an evening each)

- **Tune-ability** — pull speeds, cooldown, colours into a single `config.js` so
  values are easy to experiment with. *Files: new `config.js`.*

## Gameplay (a weekend each)

- **Waves & difficulty ramp** — instead of a fixed 4 enemies that endlessly
  respawn, spawn escalating waves (more/tougher enemies each round). Builds on
  the enemy system already in place. *Files: `main.js`.*
- **Smarter AI** — line-of-sight checks (don't shoot through crates), aim
  leading, and using cover. *Files: `enemy.js`.*
- **Enemy health bars** — a small billboarded bar above each enemy so you can
  see how close they are to dying. *Files: `enemy.js`.*
- **Tank-vs-tank collision** — right now tanks can drive through each other and
  the player; add hull-to-hull blocking. *Files: `physics.js`, `main.js`.*
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
- **Real multiplayer** — the big one. Design is captured in
  [`MULTIPLAYER.md`](./MULTIPLAYER.md): recommended model is a room server
  (Colyseus), the hard part is netcode not transport, and the prerequisites
  (sim/render split, fixed timestep, entity ids, entities-as-collections) are
  already the foundation items above — so building them now is the runway.

## Known rough edges in the PoC

- Targets respawn via `setTimeout`, which keeps running even if the game is later
  paused — fine for now, but a proper game timer would be cleaner.
- Collision treats the tank as a circle and obstacles as axis-aligned boxes, so
  contact isn't pixel-perfect (good enough for arcade feel).
- No pause state or menu; the loop starts immediately on load.
