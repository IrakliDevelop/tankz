# Tankz — Roadmap & Improvement Ideas

A running list of possible additions for the proof-of-concept, roughly ordered
from "quick win" to "bigger project". Each item notes the main file(s) it would
touch so it's easy to pick one up.

## Done

- ✅ **Playable deterministic roguelite MVP** — six escalating waves, raider /
  brute / boss enemies, HP and damage, seeded drops, between-wave build choices,
  victory, game over, and restart on the PixiJS simulation/render foundation.
  _Files: `src/core/*`, `src/view/*`, `src/main.ts`, `index.html`._

- ✅ **Sound effects** — engine rumble (revs while driving), firing thoomp, and
  metallic hit ping. All synthesized live with the Web Audio API, so there are
  no audio files to ship. _File: `audio.js`, wired in `main.js`._
- ✅ **Shot juice** — muzzle flash (real point light), barrel recoil + muzzle
  climb, muzzle smoke, camera shake (on fire + lighter on hit), and a crosshair
  that blooms on fire. _Files: `tank.js`, `projectile.js`, `main.js`._
- ✅ **Reload indicator** — bottom-centre bar that refills over `FIRE_COOLDOWN`;
  the crosshair also dims/reddens while reloading. _Files: `index.html`, `main.js`._
- ✅ **Drive dust** — puffs kicked up behind the tracks while moving, reusing the
  smoke particle system. _Files: `projectile.js`, `tank.js`, `main.js`._
- ✅ **Tanki-style controls** — WASD/arrows drive the hull, Z/X rotate the turret,
  Space fires; camera follows the turret, not the hull. _Files: `tank.js`, `input.js`, `main.js`._
- ✅ **Enemy tanks + HP + game over** — AI enemies (track/approach/circle/shoot),
  team-based projectile damage, player & enemy health, explosions, enemy respawn,
  armor bar, kills counter, and a DESTROYED/restart overlay.
  _Files: `enemy.ts`, `physics.ts`, `projectile.ts`, `tank.ts`, `world.ts`, `main.ts`, `index.html`._
- ✅ **TypeScript migration** — all of `src/` is now strict TS; shared types in
  `types.ts`; `npm run typecheck` / `build` gate on `tsc`. See `ARCHITECTURE.md`
  for the stack + code-structure direction.

## Architecture / foundations (see ARCHITECTURE.md)

- **Composition refactor** — de-duplicate `Tank`/`Enemy` into composed parts
  (chassis, health, movement, weapon, AI brain). The recommended _next_ step.
- **Separate simulation from rendering** — keep game logic Three/DOM-free so it's
  testable and could later run server-authoritative (Tanki is multiplayer).
- **Fixed-timestep loop**, **config module**, **game-state machine**, **object
  pooling** — see the priority list in `ARCHITECTURE.md`.
- **Physics engine (Rapier / cannon-es)** — deferred until tank-vs-tank / arcing
  shells / toppling props are wanted.

## Quick wins (an evening each)

- **Tune-ability** — pull speeds, cooldown, colours into a single `config.js` so
  values are easy to experiment with. _Files: new `config.js`._

## Gameplay (a weekend each)

- ✅ **Physical combat and expanding arenas** — deterministic tank-to-tank
  blocking with chassis mass, three wave-tiered authored arena templates, and
  repair / shield / timed-overdrive drops. The approved implementation is
  documented in `DESIGN.md` and `ARCHITECTURE.md`.
- **Smarter AI** — line-of-sight checks (don't shoot through crates), aim
  leading, and using cover. _Files: `enemy.js`._
- **Enemy health bars** — a small billboarded bar above each enemy so you can
  see how close they are to dying. _Files: `enemy.js`._
- **Minimap** — a small top-down 2D canvas showing tank + enemies + crates.
  _Files: `index.html`, new `minimap.js`._

## Bigger / structural

- **Physics-ish movement** — acceleration, momentum, and turning that scales with
  speed instead of instant velocity. _Files: `tank.js`._
- **Better collision** — swap the box tests for a small library (e.g. a 2D
  physics engine) if interactions get complex. _Files: `tank.js`, `projectile.js`._
- **Destructible cover** — crates that take damage and break apart. _Files: `world.js`._
- **Model & texture upgrade** — replace primitive geometry with a glTF tank model
  loaded via `GLTFLoader`; add ground textures. _Files: `tank.js`, `world.js`._
- **Mobile/touch controls** — on-screen joystick + fire button. _Files: new `touch.js`._
- **Gamepad support** — read the Gamepad API in the input layer. _Files: `input.js`._

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
