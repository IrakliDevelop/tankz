# Tankz — Multiplayer (future design notes)

**Status: not built. This is a plan so today's single-player choices don't
paint us into a corner.** Inspiration is Tanki Online; the desired feel is
"someone hosts a room, friends join by code."

## Honest difficulty

- **Two tanks visibly moving on each other's screens:** ~1–2 weeks. A small
  relay/room server + basic state sync gets you here.
- **Feels like Tanki (smooth, fair, hit detection that feels right under lag):**
  months. The transport is easy; good _netcode_ is the mountain — prediction,
  reconciliation, interpolation, and lag-compensated shooting.

Multiplayer is the one feature you can't cleanly bolt on later **unless the
simulation is separable from rendering.** That's already priority #2 in
`ARCHITECTURE.md` — so the foundation work and the multiplayer runway are the
same work.

## The browser reality (important)

A browser tab **cannot accept inbound connections** — it can't literally be a
server others dial into. So "host a room" means one of:

### Model A — Small room server (recommended)

A lightweight Node server (or a framework like **Colyseus**) owns the rooms and
the authoritative game state. Clients send inputs; server simulates and
broadcasts snapshots. To the user it still feels like "host a room, join by
code" — the server just creates the room.

- **Pros:** authoritative (cheat-resistant), consistent, no host-advantage, no
  host-migration problem, scales past 2 players, simplest _good_ netcode.
- **Cons:** you run a server (cheap: Fly.io / Railway / a $5 VPS). Simulation
  must be headless (no Three.js/DOM) — hence the sim/render split.

### Model B — Browser "listen-server" via WebRTC

One player's browser is the authority; peers connect via **WebRTC DataChannels**.
Still needs a small **signaling** server to introduce peers, plus **STUN/TURN**
for NAT traversal.

- **Pros:** true P2P "hosting"; no game server to run (only tiny signaling);
  great for a few friends.
- **Cons:** host has 0 latency (advantage) and everyone eats the host's ping;
  host leaving kills the game (host migration is hard); host can cheat; host's
  machine must be capable. More fiddly than it sounds because of TURN.

**Recommendation:** go **Model A with Colyseus**. It's room-based out of the box,
handles state sync + client-prediction hooks, and matches the mental model with
the least effort. Revisit Model B only if "zero server cost / pure P2P" becomes
a hard requirement.

## Core netcode concepts we'll need (either model)

- **Authority** — one side owns the truth per entity (server/host). Clients
  propose; authority disposes.
- **Fixed-tick simulation** — sim advances in fixed steps (e.g. 30–60 Hz);
  network broadcasts less often (e.g. 15–20 Hz). _(Already a roadmap item.)_
- **Input messages** — clients send compact input state (keys down, turret
  angle), not positions. Small and cheat-resistant.
- **Client-side prediction** — your own tank responds instantly to your input,
  then reconciles when the authority's state arrives (correct if they disagree).
- **Snapshot interpolation** — remote tanks are rendered ~100ms in the past and
  smoothly interpolated between received snapshots, so they look fluid despite a
  low update rate.
- **Lag compensation for shooting** — the hard one. The server rewinds to what
  the shooter saw when they fired to judge hits fairly. Add last.

## Transport choice

- **WebSocket (TCP)** — simplest; totally adequate for tank-paced gameplay.
  Start here.
- **WebRTC DataChannel (UDP-like)** — lower latency, unreliable-ordered option;
  worth it later for twitch precision, but adds signaling/TURN complexity.

## Library options

- **Colyseus** — authoritative, room-based Node framework with automatic state
  sync. Best fit for "host a room, join by code." **Top pick.**
- **geckos.io** — WebRTC/UDP for browser games, if we want UDP later.
- **socket.io** — easy WebSocket rooms if we want to hand-roll the sync.

## Suggested incremental path

0. **(now, no netcode)** Architecture hygiene that makes MP possible later:
   - Sim/render split: a `GameState` that advances `(inputs, dt) → state` with
     **no** Three.js/DOM calls; rendering just reads state.
   - Fixed timestep loop.
   - Stable **entity ids** on tanks/shells (needed to sync "who is who").
   - Treat players as a **list**, not "the one player" — even single-player.
   - Keep input as a serializable struct (we already read input as state).
1. Generalize the game to **N players** (local/hotseat or just data-model wise).
2. **Transport:** stand up a Colyseus room; get 2 real players' tanks moving.
3. **Netcode feel:** interpolation for remotes → prediction for self → then
   lag-compensated hits.
4. **Lobby/rooms polish:** room codes, join/leave, scores, reconnect.

## What this means for single-player work today

None of the above needs building now — but four cheap habits keep the door open,
and they're good practice regardless:

1. Keep **game logic out of `three`/DOM** (push it toward `physics.ts`-style
   pure modules / a `GameState`).
2. **Fixed timestep** when we do the loop refactor.
3. Give entities **ids**.
4. Model the world as **collections of entities**, not hardcoded singletons.

The composition refactor (next planned step) naturally pushes us toward all four.
