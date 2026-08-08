import type { Arena, ArenaId } from './arena';
import { arenaTemplateForWave, parseArena } from './arena';
import { SIM_DT, TANK, TANK_COLLISION, WAVE } from './config';
import type { EffectState } from './effects';
import { createEffect, stepEffects } from './effects';
import type { EnemyKind, EnemyState } from './enemy';
import { createEnemy, enemyRadius, stepEnemy } from './enemy';
import { takeId, type IdSource } from './ids';
import type { InputIntent } from './input';
import type { PickupState } from './pickup';
import { collectPickups, createPickup, rollPickupKind } from './pickup';
import type { PlayerState, UpgradeKind } from './player';
import {
  applyPlayerDamage,
  applyUpgrade,
  createPlayer,
  effectiveFireCooldown,
  playerMovement,
  rollUpgradeChoices,
  stepPlayerStatus,
} from './player';
import type { Shell } from './projectile';
import { spawnShell, stepShells } from './projectile';
import { shuffledIndices, type RngSource } from './rng';
import { stepTank } from './tank';
import type { GamePhase, Vec2 } from './types';
import { resolveTankCollisions, type TankCollider } from './vehicleCollision';

const DEFAULT_SEED = 0x5eed_1234;

/** The complete simulation state. Pure data — no Pixi, no DOM. */
export interface SimState extends IdSource, RngSource {
  arena: Arena;
  arenaId: ArenaId;
  arenaRevision: number;
  players: PlayerState[];
  enemies: EnemyState[];
  shells: Shell[];
  pickups: PickupState[];
  effects: EffectState[];
  phase: GamePhase;
  wave: number;
  kills: number;
  salvage: number;
  score: number;
  upgradeChoices: UpgradeKind[];
  runNumber: number;
  elapsed: number;
}

export function createSim(seed = DEFAULT_SEED, runNumber = 1): SimState {
  const template = arenaTemplateForWave(1);
  const state: SimState = {
    arena: parseArena(template.layout),
    arenaId: template.id,
    arenaRevision: 1,
    players: [],
    enemies: [],
    shells: [],
    pickups: [],
    effects: [],
    phase: 'combat',
    wave: 1,
    kills: 0,
    salvage: 0,
    score: 0,
    upgradeChoices: [],
    runNumber,
    elapsed: 0,
    rngState: seed >>> 0,
    nextEntityId: 1,
  };
  state.players.push(createPlayer(takeId(state), template.playerSpawn));
  startWave(state);
  return state;
}

/** Advance the world by exactly one fixed timestep. */
export function stepSim(state: SimState, intent: InputIntent): void {
  if (intent.restart && (state.phase === 'gameOver' || state.phase === 'victory')) {
    restartRun(state);
    return;
  }

  const player = state.players[0];
  if (state.phase === 'upgrade') {
    const choice =
      intent.upgradeChoice === null ? undefined : state.upgradeChoices[intent.upgradeChoice];
    if (choice) {
      applyUpgrade(player, choice);
      state.wave += 1;
      startWave(state);
    }
    return;
  }
  if (state.phase !== 'combat') return;

  state.elapsed += SIM_DT;
  stepPlayerStatus(player, SIM_DT);
  stepTank(player.body, intent, state.arena, SIM_DT, playerMovement(player));
  stepPlayerWeapon(state, player, intent);

  for (const enemy of state.enemies) {
    for (const shot of stepEnemy(enemy, player, state.arena, SIM_DT)) {
      state.shells.push(
        spawnShell(takeId(state), shot.pos, shot.angle, 'enemy', enemy.id, shot.damage),
      );
    }
  }
  resolveTankCollisions(tankColliders(state, player), state.arena);

  for (const pos of stepShells(state.shells, state.arena, SIM_DT)) {
    state.effects.push(createEffect(takeId(state), 'impact', pos));
  }
  resolveShellHits(state, player);
  removeDestroyedEnemies(state, player);

  for (const pickup of collectPickups(state.pickups, player)) {
    state.effects.push(createEffect(takeId(state), pickup.kind, pickup.pos));
  }
  stepEffects(state.effects, SIM_DT);

  if (player.hp <= 0) {
    player.hp = 0;
    player.body.speed = 0;
    state.phase = 'gameOver';
    state.shells.length = 0;
    return;
  }

  if (state.enemies.length === 0) finishWave(state);
}

export function startWave(state: SimState): void {
  state.phase = 'combat';
  state.upgradeChoices = [];
  state.shells.length = 0;
  state.enemies.length = 0;

  const template = arenaTemplateForWave(state.wave);
  if (template.id !== state.arenaId) {
    state.arena = parseArena(template.layout);
    state.arenaId = template.id;
    state.arenaRevision += 1;
    state.pickups.length = 0;
    state.effects.length = 0;
    const player = state.players[0];
    player.body.pos = { x: template.playerSpawn.x, y: template.playerSpawn.y };
    player.body.speed = 0;
  }

  const order = shuffledIndices(state, template.enemySpawns.length);
  const finalWave = state.wave === WAVE.maxWaves;
  const enemyCount = finalWave
    ? WAVE.finalMinions + 1
    : Math.min(WAVE.maxEnemies, WAVE.baseEnemies + state.wave);

  for (let i = 0; i < enemyCount; i++) {
    const kind: EnemyKind =
      finalWave && i === 0
        ? 'boss'
        : state.wave >= WAVE.bruteStartsAt && (i + state.wave) % 3 === 0
          ? 'brute'
          : 'raider';
    const spawn = template.enemySpawns[order[i % order.length]];
    state.enemies.push(createEnemy(takeId(state), kind, spawn, state.wave));
  }
}

function tankColliders(state: SimState, player: PlayerState): TankCollider[] {
  return [
    {
      id: player.id,
      body: player.body,
      radius: TANK.radius,
      mass: TANK_COLLISION.playerMass,
    },
    ...state.enemies.map((enemy) => ({
      id: enemy.id,
      body: enemy.body,
      radius: enemyRadius(enemy),
      mass:
        enemy.kind === 'boss'
          ? TANK_COLLISION.bossMass
          : enemy.kind === 'brute'
            ? TANK_COLLISION.bruteMass
            : TANK_COLLISION.raiderMass,
    })),
  ];
}

function stepPlayerWeapon(state: SimState, player: PlayerState, intent: InputIntent): void {
  player.cooldown = Math.max(0, player.cooldown - SIM_DT);
  if (!intent.fire || player.cooldown > 0) return;

  player.cooldown = effectiveFireCooldown(player);
  for (let i = 0; i < player.shotCount; i++) {
    const spread = (i - (player.shotCount - 1) / 2) * player.shotSpread;
    const angle = player.body.turretAngle + spread;
    const muzzle = {
      x: player.body.pos.x + Math.cos(angle) * TANK.muzzleOffset,
      y: player.body.pos.y + Math.sin(angle) * TANK.muzzleOffset,
    };
    state.shells.push(
      spawnShell(takeId(state), muzzle, angle, 'player', player.id, player.shellDamage),
    );
  }
}

function resolveShellHits(state: SimState, player: PlayerState): void {
  for (let i = state.shells.length - 1; i >= 0; i--) {
    const shell = state.shells[i];
    if (shell.team === 'player') {
      const enemy = state.enemies.find(
        (candidate) =>
          candidate.hp > 0 && overlaps(shell.pos, candidate.body.pos, enemyRadius(candidate)),
      );
      if (!enemy) continue;
      enemy.hp -= shell.damage;
      state.effects.push(createEffect(takeId(state), 'impact', shell.pos));
      state.shells.splice(i, 1);
      continue;
    }

    if (!overlaps(shell.pos, player.body.pos, TANK.radius)) continue;
    applyPlayerDamage(player, shell.damage);
    state.effects.push(createEffect(takeId(state), 'impact', shell.pos));
    state.shells.splice(i, 1);
  }
}

function removeDestroyedEnemies(state: SimState, player: PlayerState): void {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.hp > 0) continue;

    state.kills += 1;
    state.salvage += WAVE.salvagePerKill;
    state.score += WAVE.scorePerKill;
    state.effects.push(createEffect(takeId(state), 'explosion', enemy.body.pos));

    const kind = rollPickupKind(state, state.wave, player.hp / player.maxHp);
    if (kind) {
      state.pickups.push(createPickup(takeId(state), kind, enemy.body.pos));
    }
    state.enemies.splice(i, 1);
  }
}

function finishWave(state: SimState): void {
  state.shells.length = 0;
  if (state.wave >= WAVE.maxWaves) {
    state.phase = 'victory';
    return;
  }
  state.phase = 'upgrade';
  state.upgradeChoices = rollUpgradeChoices(state);
}

function restartRun(state: SimState): void {
  const nextSeed = (state.rngState + 0x9e37_79b9 + state.runNumber) >>> 0;
  Object.assign(state, createSim(nextSeed, state.runNumber + 1));
}

function overlaps(a: Vec2, b: Vec2, radius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radius * radius;
}
