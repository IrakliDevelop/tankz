# CLAUDE.md

Project guidance for AI agents lives in **[AGENTS.md](./AGENTS.md)** — read it
first. It covers the architecture invariants (sim/render split, determinism,
fixed timestep), conventions, the definition of done, and git rules.

## Project skills

- **add-sim-feature** (`.claude/skills/add-sim-feature/`) — the right way to add
  gameplay (enemies, pickups, weapons, rooms, …) without breaking the sim/render
  split.
- **verify** (`.claude/skills/verify/`) — drive the game headlessly and capture
  screenshot evidence.
- **pixijs-\*** (`.agents/skills/`) — PixiJS v8 reference skills.
