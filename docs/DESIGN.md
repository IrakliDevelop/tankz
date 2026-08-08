# Tankz — Game Design Document

> **Status: vision.** This is the long-term design we're building toward, agreed
> at the point where the codebase was a clean single-tank sandbox (PixiJS v8 + TS,
> sim/render split, fixed timestep, tile arena). It is meant to steer development,
> not to lock every detail. Update it as reality teaches us things.

## 1. Pitch

A post-apocalyptic **action roguelite** where you pilot a scrap-built tank through
procedural ruins — mastering real vehicle handling while scavenging weapons and
parts into a new build every run.

## 2. Design Pillars

Everything in the game should serve at least one of these. If a feature serves
none, cut it.

1. **The tank feels like a tank.** Momentum, weight, hull-vs-turret control, and
   traction are a skill you master. This is our differentiator from every other
   twin-stick roguelite — not just a theme.
2. **Every run is a different build.** Scavenged weapons, parts, and mods stack
   into a unique machine each time.
3. **Death teaches and rewards.** Permadeath ends a run, but banked salvage
   permanently expands your options (new tanks, parts, perks).
4. **Readable brutal wasteland.** Rusty, scrappy, particle-heavy. Legible chaos
   over realism.

## 3. Core Loops

Three nested timescales, each satisfying on its own.

### Second-to-second — combat

Position your hull, aim the turret, manage momentum and weapon cooldowns, dodge,
and use cover. This is where the driving skill lives and where the moment-to-moment
fun has to be proven first.

### Per-run — a session (~20–40 min)

Descend floor by floor through connected procedural rooms. Clear a room → doors
open → choose your path. Pick up weapons/parts/mods, spend scavenged **scrap** at
wrecks/traders, fight a boss to end each floor. Death ends the run.

### Meta — across runs

Banked salvage unlocks new **tank chassis (classes)**, weapons, and starting
perks in a persistent garage/hideout. Your _options_ deepen even when a run fails,
so failure still moves you forward.

## 4. The Tank — Identity & Controls

The core identity hook. Handling is a skill, not friction to be minimized.

- **Controls (keep the current scheme — it already feels good):**
  - **WASD** drives the hull, with real momentum and friction.
  - **Turret auto-tracks the mouse** at a capped turn rate (no instant snap).
  - **Left click** fires.
- **Handling as mastery:** hull weight and traction vary by chassis. A heavy
  chassis is durable but sluggish; a scout hovercraft is twitchy and fragile.
  Terrain affects grip (mud slows, rubble jolts). Positioning and drifting around
  cover are the skill ceiling.
- **Chassis = class.** Each chassis is a distinct playstyle defined by stats
  (armor, speed, traction, heat), a passive, and sometimes a unique slot layout.

## 5. Build-Crafting (in-run)

The second pillar. Runs diverge because your machine does.

- **Weapon** (the turret's gun) — distinct feel per type: cannon, autocannon,
  flak, tesla arc, arcing mortar, flamethrower, etc.
- **Parts / modules** occupy chassis slots: armor plating, treads (traction/
  speed), reactor (energy/heat), utility (dash, deployable shield, mines).
- **Mods** modify weapons/parts: piercing, ricochet, incendiary, multishot,
  homing.
- **Synergies** emerge from combinations — e.g., ricochet + piercing in a
  corridor becomes a room-clearing nightmare. Discovering these is the
  "one more run" hook.

## 6. World & Run Structure

- **Biomes / floors** with escalating threat and distinct flavor, e.g.
  _The Sprawl_ (ruined city), _The Dust Flats_, _The Reactor_. Each floor is a
  set of procedurally-connected rooms.
- **Room types:** combat, elite, treasure/loot, trader/scrap-wreck,
  event/challenge, boss.
- **Gating:** doors lock during combat; clearing a room opens the exits and lets
  you choose your path.
- **Bosses** cap each floor — scavenger warlords and mutated war-machines.

### Level generation — the technical approach (decided)

**Template-stitched rooms.** Hand-author a library of room templates as tile
layouts (which `arena.ts` already parses), then procedurally pick and connect
them per floor. This gives designed-feeling, readable rooms cheaply, plays to the
existing tile system, and makes adding content easy — the Gungeon/Isaac approach.

_(Considered and rejected for now: fully procedural tile generation via BSP/
cellular automata. More "infinite," but much harder to make consistently fun and
readable. Revisit only if handcrafted templates become a content bottleneck.)_

### Combat-space progression — the MVP approach (decided)

The six-wave MVP expands through **three authored arena tiers**, not by stretching
one room or generating arbitrary dimensions:

- Waves 1–2 use a compact salvage yard that forces early contact and teaches
  driving around cover.
- Waves 3–4 move to a medium freight depot with longer lanes and more flanking
  space for brutes and larger groups.
- Waves 5–6 use a large foundry arena with separated cover islands and enough
  room for the boss spread attack.

Arena changes happen only between waves. The player's armor, salvage, upgrades,
and active powerup timers carry forward; the tank is placed at the new room's
authored player spawn with its movement stopped. Shells, effects, and uncollected
room pickups are cleared so no encounter state leaks into the next space. Each
template owns its player and enemy spawn points, keeping spawn safety coupled to
the layout that was designed for it.

This tiered approach makes the run feel physically larger while preserving
readable, intentionally placed cover. Later procedural floors should select and
connect templates from the same format instead of replacing it.

### Physical contact and combat pickups — the MVP approach (decided)

Tanks have solid hulls. Player/enemy and enemy/enemy contacts block overlap and
allow heavier chassis to displace lighter ones, with very little bounce. This is
an arcade contact model: it should communicate mass, prevent phasing, and create
positioning pressure without turning collisions into a separate damage system.
Ramming damage is deliberately deferred until the contact behavior itself feels
fair.

Destroyed enemies can drop one of three short-loop powerups:

- **Repair kit** — restores armor and remains on the ground if armor is already
  full.
- **Shield cell** — adds temporary hit points that absorb incoming damage before
  armor, up to a fixed cap.
- **Overdrive canister** — grants a timed mobility and fire-rate boost; collecting
  another refreshes the timer rather than stacking the multiplier.

Drop selection is deterministic from the run seed. Shield and overdrive enter the
pool after the opening waves, while repair is biased upward when the player is
badly damaged. This supplies more pickups as enemy counts grow without guaranteeing
one from every kill or flooding the arena. Permanent build choices remain the
between-wave reward; combat pickups are immediate survival and tempo decisions.

## 7. Setting & Tone

Post-apocalyptic wasteland. Rusty, welded-together tanks; enemies are raiders,
drones, mutated husks, and rival war-machines. Loot is **salvage** — reinforcing
the scavenging fantasy end to end (you're a scrapper who builds from what you
find, and death is another wreck for the next scrapper).

**Art direction (phased):** start with stylized PixiJS geometry — grimy palette,
heavy particles (smoke, sparks, dust) — which looks good with primitives and needs
no art pipeline. Layer in sprite art later without changing systems.

## 8. Long-term / Stretch

- **Co-op** (2-player shared run) kept _possible_ by the existing sim/render
  split, but not built now. See `MULTIPLAYER.md` for the netcode groundwork this
  reuses.
- **Daily seeds** for shared-challenge replay.
- **Curses / heat modifiers** for post-victory difficulty scaling.
- Ongoing content: more biomes, bosses, chassis, weapons, and synergies.

## 9. Development Phasing

Ordered so each phase produces something playable and de-risks the next. Earlier
phases prove _feel_; later phases add _depth_.

1. **Combat vertical slice.** Enemies + damage/HP + death + one weapon + one
   clearable room. Proves the core second-to-second feel.
2. **The run.** Multiple template-stitched connected rooms, room clearing / door
   gating, a floor boss, in-run pickups.
3. **Builds.** Weapon variety, parts/modules, slots, mods.
4. **Meta.** Salvage currency, garage/hideout, unlockable chassis (classes) and
   starting perks.
5. **Content + polish.** More biomes, bosses, synergies, and juice.
6. **Stretch.** Co-op, daily seeds, curses/heat.

## 10. Fit With the Current Architecture

The vision was chosen to build _on_ the existing foundation, not fight it:

- **Sim/render split** — enemies, pickups, rooms, and builds all live in the pure
  `SimState`; rendering stays a read-only view. Keeps logic testable and keeps
  co-op possible.
- **Fixed timestep** — deterministic simulation, which also underpins daily seeds
  and any future netcode.
- **Entity ids + entities-as-collections** — the sim already models the world as
  data; enemies/shells/pickups are just more collections.
- **Tile arena (`arena.ts`)** — directly reused as the room-template format for
  level generation.
- **Config module** — the natural home for the many tunables build variety needs.

The near-term architecture work (composition of tank "parts", enemy AI as pure
sim, object pooling for shells/particles) is the same work this design needs — see
`ARCHITECTURE.md` and `ROADMAP.md`.
