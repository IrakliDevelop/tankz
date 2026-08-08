---
name: add-sim-feature
description: Workflow for adding a new gameplay system or entity to tankz the right way — pure core logic, config-driven tunables, unit tests, then wiring into the renderer. Use when adding enemies, pickups, weapons, projectiles, rooms, bosses, or status effects, or any new simulation behavior, in this PixiJS + TypeScript game with a sim/render split.
---

# Adding a sim feature to tankz

Use this to add gameplay (enemy, pickup, weapon, room, status effect, …) without
breaking the architecture invariants in `AGENTS.md`.

## Invariants you must not break

- Core logic (`src/core/`) is **pure**: no Pixi, DOM, `window`, `Math.random`,
  or wall-clock.
- The sim is **deterministic** and **fixed-timestep** (`SIM_DT`). Randomness
  comes from a seeded PRNG threaded through `SimState`.
- Tunables go in `config.ts`. The view (`src/view/`) only **reads** state.

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Model state (types + a field on SimState)
- [ ] 2. Add tunables to config.ts
- [ ] 3. Write the pure step function
- [ ] 4. Wire it into stepSim
- [ ] 5. Unit-test the pure logic
- [ ] 6. Render it (view only)
- [ ] 7. typecheck + test + verify
```

**1. Model state.** Add types in the feature's module (or `types.ts` if shared).
Store instances as a **collection** on `SimState` (e.g. `enemies: Enemy[]`),
carrying an `EntityId` from `ids.ts` — even if there's "only one" today.

**2. Config.** Put every number (speed, HP, damage, cooldown, radius, spawn
rate) in `src/core/config.ts`. No magic numbers in logic.

**3. Pure step function.** Write `stepX(...args, dt)` in a new `src/core/x.ts`.
It takes and mutates/returns data and imports only other core modules. Need
randomness? Take a seeded RNG (thread it through `SimState`) — never
`Math.random`.

**4. Wire into the sim.** Call your step from `stepSim` (`src/core/sim.ts`) in
the correct order relative to existing steps (movement → firing → projectiles →
collisions). Keep `stepSim` a readable sequence of calls.

**5. Test.** Add `src/core/x.test.ts` (Vitest); cover behavior + edge cases
(spawn, expiry, collision, death). Run `npm test`.

**6. Render.** In `src/view/`, read the new state and draw it. Interpolate
motion by `alpha` for smoothness (see how the tank is rendered in
`renderer.ts`). All Pixi stays here. For PixiJS v8 APIs, consult the
`pixijs-*` skills in `.agents/skills/`.

**7. Verify.** `npm run typecheck && npm test`, then drive it in-browser via the
**verify** skill (headless Playwright + screenshots).

## Anti-patterns

- ❌ Importing `pixi.js` in `src/core/`.
- ❌ `Math.random()` / `Date.now()` in the sim.
- ❌ Advancing state off the render frame delta instead of `SIM_DT`.
- ❌ Hardcoded numbers in logic instead of `config.ts`.
- ❌ A one-off singleton instead of an id'd collection.
