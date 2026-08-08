# AGENTS.md — Working in tankz

Canonical guide for AI agents (Cursor, Claude Code, and others). **Read this
first.** Cursor also loads focused rules from `.cursor/rules/`, but this file is
the shared source of truth so nothing drifts between agents.

## What this is

Tankz is a post-apocalyptic action **roguelite** (top-down 2D) built with
**PixiJS v8 + TypeScript**, bundled by **Vite**, tested with **Vitest**.

- Vision / game design: `docs/DESIGN.md`
- Architecture direction: `docs/ARCHITECTURE.md`
- Roadmap: `docs/ROADMAP.md` · Multiplayer groundwork: `docs/MULTIPLAYER.md`

Current state: a clean single-tank sandbox (drive, aim, fire, tile arena). Most
roguelike systems (enemies, rooms, builds, meta) are **not built yet** — you'll
often be adding them. Use the `add-sim-feature` skill for that.

## Golden rules — the architecture invariants

These are load-bearing. Breaking one is a bug even if the game still runs.

1. **Sim/render split.** All game logic lives in `src/core/` and must be
   **pure**: no `pixi.js`, no DOM, no `window`/`document`, no canvas. Rendering
   lives in `src/view/` and only **reads** sim state. `src/main.ts` wires them
   together and owns the loop.
2. **The sim is deterministic.** Same initial state + same `InputIntent` stream
   ⇒ `stepSim` always produces the same result. No `Math.random()`, `Date.now()`,
   `performance.now()`, or wall-clock inside `src/core/`. When you need
   randomness, thread a **seeded PRNG through `SimState`** (required for daily
   seeds and future netcode).
3. **Fixed timestep.** The sim advances in exact `SIM_DT` (1/60 s) steps via the
   accumulator in `main.ts`; rendering interpolates between the last two states
   by `alpha`. Never advance game state off a variable frame delta — sim code
   uses `dt = SIM_DT`.
4. **Tunables live in `config.ts`.** Speeds, HP, cooldowns, sizes — no magic
   numbers scattered through logic. Gameplay numbers → `src/core/config.ts`.
5. **World = collections of entities with ids.** Model the world as data (arrays
   of entities carrying an `EntityId` from `ids.ts`), not hardcoded singletons —
   even where there's "only one" today.
6. **Input is an intent struct.** The sim only ever sees `InputIntent`
   (`throttle`, `steer`, `aimPoint`, `fire`). Raw keyboard/mouse handling stays
   in the view/bootstrap layer.

Why they matter: they're what keep the sim testable, seed-able, and keep co-op /
netcode possible (see `docs/MULTIPLAYER.md`). Preserve them.

## Layout

| Path          | Role                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core/`   | Pure simulation: `sim.ts`, `tank.ts`, `projectile.ts`, `physics.ts`, `arena.ts`, `config.ts`, `input.ts`, `ids.ts`, `types.ts` + colocated `*.test.ts` |
| `src/view/`   | Rendering only: `renderer.ts`, `camera.ts`, `visuals.ts`                                                                                               |
| `src/main.ts` | Bootstrap, input capture, fixed-timestep loop                                                                                                          |
| `docs/`       | Design + architecture docs                                                                                                                             |

## Definition of done

Before claiming a change is complete:

1. `npm run typecheck` passes (strict TS, zero errors).
2. `npm test` passes (add/adjust tests for new core logic).
3. Anything visual/gameplay: verify in-browser via the **verify** skill
   (headless Playwright + screenshots) — don't assert "it works" unseen.

## Conventions

- **TypeScript strict.** No `any`; prefer precise types and `readonly` where it
  helps. Let inference work internally; annotate exported/public boundaries.
- **Testing.** Pure core logic gets Vitest unit tests, colocated as
  `name.test.ts`. Test behavior and edge cases, not implementation detail.
- **Comments explain _why_, not _what_.** No narration (`// increment i`).
  Document intent, trade-offs, and non-obvious constraints — match the terse
  style in `tank.ts` / `sim.ts`.
- **PixiJS v8.** Consult the `pixijs-*` skills in `.agents/skills/` before
  non-trivial rendering work; v8 differs substantially from v7.

## Tooling

- **Lint:** `npm run lint` (fix: `npm run lint:fix`). ESLint **enforces the
  architecture invariants** for `src/core/**` — it will error on importing
  `pixi.js`, touching `window`/`document`, or using `Math.random` / `Date.now` /
  `performance.now` in the simulation. Treat a lint failure there as a design
  violation, not a nuisance.
- **Format:** `npm run format` (check: `npm run format:check`). Prettier owns
  formatting; don't hand-format or argue style.
- **Coverage:** `npm run coverage`.
- **Git hooks (Husky):** `pre-commit` runs lint-staged (eslint + prettier) then
  `typecheck` + `test`; `commit-msg` runs commitlint. Broken or badly-messaged
  commits are rejected before they land. Don't bypass with `--no-verify`.

## Testing best practices

- **Test the pure core, not the pixels.** Unit-test `src/core/` logic; verify
  `src/view/` visually via the **verify** skill.
- **Keep tests deterministic.** No randomness or wall-clock; feed fixed inputs
  and assert exact/`toBeCloseTo` outputs (see `physics.test.ts`).
- **Test behavior + edges** (spawn, expiry, collision, death, wrap-around), not
  private implementation detail — so tests survive refactors.

## Git conventions

See `.cursor/rules/git-conventions.mdc`. In short: Conventional Commits
(`type(scope): summary`), small focused commits, never commit secrets or
`node_modules`, and don't `git push` / force-push unless explicitly asked. Only
commit when the user asks.
