# Tankz — Architecture Notes & Direction

Decisions and reasoning for growing this from a PoC into something real.
Written when the codebase was ~10 small files, on purpose — cheap to steer now.

## Stack decisions

- **Three.js** — kept. It's a *renderer*, not a game engine: it gives us the
  scene graph, camera, lights, materials, loaders, and nothing else. Everything
  that makes this a "game" (loop, collision, input, audio, entities, state) we
  assemble ourselves. That's a feature for learning, not a limitation to escape.
  We are **not** switching to Babylon/PlayCanvas/Godot — it would throw away
  working code and understanding for magic.
- **TypeScript** — adopted. `strict` on. `npm run typecheck` (or `build`, which
  runs `tsc --noEmit` before vite) is the gate.
- **No physics engine yet.** Our circle-vs-AABB collision (`physics.ts`) is the
  right amount of physics for a top-down arcade tank game.
  - **Adopt one when** we want: tanks bumping/pushing each other, shells that
    arc/ricochet, stacking or toppling props, slopes, or explosion knockback.
  - **When we do:** first choice **Rapier** (`@dimforge/rapier3d`, Rust→WASM,
    fast, long-lived); gentler alternative **cannon-es** (pure JS, easy to learn).
  - Concrete trigger: the day tank-vs-tank collision annoys us enough to want it
    done "properly."

## Code architecture

Current style: **OOP with classes** (`Tank`, `Enemy`, `ProjectileSystem`, …).

### Direction: composition-first OOP now, ECS only if it earns its place

- **Not full ECS yet.** Entity-Component-System (entities = ids, components =
  data, systems = functions; libs like `miniplex`) is how big games scale, but
  it's a real paradigm shift and would be over-engineering at this size.
- **Fix the current smell with composition.** `Tank` and `Enemy` duplicate a lot
  (mesh building, movement, collision, muzzle math). Next refactor: a tank is
  *composed of* parts — a chassis/mesh, a `Health` component, a movement helper,
  a weapon, and (for enemies) an AI brain — instead of a class hierarchy. This
  removes the duplication and keeps the door open to ECS without a rewrite.
- **Migrate to ECS** (miniplex) only if we end up with many unit types × many
  behaviours and the composition approach starts creaking.

## Best practices to adopt, in priority order

1. ✅ **TypeScript** — done.
2. ⬜ **Separate simulation from rendering.** Keep game logic free of Three/DOM.
   Pays off twice: (a) the logic becomes unit-testable, and (b) since Tanki is
   *multiplayer*, this is the single decision that makes a future
   server-authoritative net layer possible instead of a rewrite. `physics.ts` is
   already pure/testable; keep pushing logic that way.
3. ⬜ **Fixed-timestep update loop** (accumulator). Deterministic, stable
   simulation regardless of frame rate. We currently use a clamped variable `dt`.
4. ⬜ **Config/constants module.** All tunables (speeds, HP, cooldowns, colours)
   in one typed place.
5. ⬜ **Game-state machine.** menu → playing → paused → gameOver, instead of the
   current ad-hoc `gameOver` boolean.
6. ⬜ **Object pooling** for shells/particles — reuse instead of allocating per
   shot, to avoid GC hitches at scale. (Geometries/materials are already shared.)

## Module map (current)

| File | Responsibility |
|------|----------------|
| `main.ts` | Bootstraps renderer/scene/camera, owns the game loop, wires everything, HUD |
| `world.ts` | Ground, walls, crate obstacles, enemy spawn points |
| `tank.ts` | Player tank: mesh, movement, turret, recoil, HP |
| `enemy.ts` | AI tank: same shape + a simple brain |
| `projectile.ts` | Shells, particles (sparks/smoke), muzzle flashes, hit detection |
| `physics.ts` | Pure helpers: circle-vs-box collision, angle math (no Three/DOM state) |
| `input.ts` | Keyboard state polling |
| `audio.ts` | Procedural Web Audio (engine, fire, hit, explosion) |
| `types.ts` | Shared types: `Team`, `Obstacle`, `Combatant` |
