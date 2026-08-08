# Tankz — Architecture Notes & Direction

Decisions and reasoning for growing this from a PoC into something real.
Written when the codebase was ~10 small files, on purpose — cheap to steer now.

## Current foundation

- **PixiJS v8** renders a 2D scene graph; it does not own gameplay state.
- **TypeScript** runs in strict mode. `npm run typecheck` is a required gate.
- **Pure deterministic simulation** lives in `src/core/`. Given a seed and the
  same `InputIntent` sequence, `stepSim` produces the same state.
- **Fixed timestep** advances gameplay at `SIM_DT`; the view interpolates between
  fixed states and only reads the simulation.
- **Data-oriented entities** are id-bearing records stored in collections. We do
  not need a full ECS at the current scale.

## Tank contact solver (decided)

Tank hulls are circles, matching the existing tank-vs-tile approximation. After
all tanks move for a fixed step, `stepSim` resolves player/enemy and enemy/enemy
contacts in a dedicated pure core system:

1. Build colliders from the player and enemy collections and sort by `EntityId`.
2. Run a small fixed number of pairwise solver iterations.
3. For each overlapping pair, separate along the contact normal in inverse-mass
   proportion. Raiders and the player use normal mass; brutes and the boss are
   progressively heavier.
4. Remove only the closing component of their forward velocities with low
   restitution, then project each result back onto the tank's scalar forward
   speed representation.
5. Re-resolve nearby solid tiles after each pass so separating two tanks cannot
   leave either embedded in cover.

Stable id order, a fixed iteration count, and an id-derived fallback normal for
coincident centers make the result deterministic. This is intentionally a small
sequential-impulse-style solver rather than a physics dependency. Adopt a 2D
physics engine only when we need rotation impulses, dynamic props, continuous
collision, constraints, or many interacting body shapes. Tank blocking alone
does not justify the runtime and determinism cost.

## Arena progression (decided)

`arena.ts` owns immutable `ArenaTemplate` records containing an id, display name,
minimum wave, tile layout, player spawn, and enemy spawn list. A pure
`arenaTemplateForWave` function maps waves to the compact, medium, or large tier.
The current parsed arena plus its template id and revision live in `SimState`.

`startWave` changes templates only at tier boundaries. A change reparses the
layout, increments the revision, places the player at the authored spawn with
zero speed, and clears encounter-local shells, pickups, and effects. Persistent
run data remains untouched. Enemy spawn shuffling continues to use the seeded RNG.

The renderer keeps the arena `Graphics` stable during a room. It replaces and
destroys that static container only when `arenaRevision` changes; no arena geometry
is cleared and retessellated every frame.

## Combat powerups (decided)

Pickups stay as an id-bearing collection in `SimState`. Drop kind is chosen by a
pure deterministic weighted roll using the state PRNG. Eligibility and weights
are configuration data: repair is available immediately and gets a low-armor
bias; shield and overdrive unlock in later waves.

`PlayerState` owns shield points and the remaining overdrive duration. Damage is
applied through one shield-first helper. Overdrive modifies values returned by
`playerMovement` and the effective weapon cooldown; its timer advances only in
combat by `SIM_DT`. A second overdrive refreshes duration rather than multiplying
the bonus, preventing runaway stacking. Pickup collection returns kind plus
position so the view can render the correct effect without gameplay knowledge.

All sizes, masses, weights, durations, caps, and multipliers live in `config.ts`.

## Module map

| Path                           | Responsibility                                      |
| ------------------------------ | --------------------------------------------------- |
| `src/core/sim.ts`              | Complete run state and fixed-step system ordering   |
| `src/core/tank.ts`             | Shared tank body and tile collision                 |
| `src/core/vehicleCollision.ts` | Deterministic tank-to-tank contact resolution       |
| `src/core/arena.ts`            | Tile parsing, queries, and authored arena templates |
| `src/core/player.ts`           | Player stats, damage, status timers, and upgrades   |
| `src/core/enemy.ts`            | Enemy data, movement intent, targeting, and firing  |
| `src/core/pickup.ts`           | Drop selection and collection effects               |
| `src/core/projectile.ts`       | Shell movement and arena expiry                     |
| `src/core/config.ts`           | Gameplay tunables                                   |
| `src/view/renderer.ts`         | Id-based Pixi visual mirroring and interpolation    |
| `src/view/visuals.ts`          | Stable Pixi geometry factories                      |
| `src/main.ts`                  | Input capture, accumulator, camera, and bootstrap   |

## Still deferred

- A full menu/pause state machine.
- Object pooling once profiling shows shell/effect allocation causes hitches.
- ECS until entity variety makes collection-based systems hard to maintain.
- A physics engine until the contact requirements exceed deterministic circles
  and static AABBs.
