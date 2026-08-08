/** Side of one arena tile, in world pixels. */
export const TILE_SIZE = 32;

/** Fixed simulation timestep (seconds). */
export const SIM_DT = 1 / 60;

export const TANK = {
  radius: 13,
  accel: 520,
  maxSpeed: 210,
  maxReverseSpeed: 120,
  friction: 4,
  hullTurnRate: 2.7,
  turretTurnRate: 5,
  muzzleOffset: 26,
  maxHp: 100,
} as const;

export const TANK_COLLISION = {
  solverIterations: 12,
  restitution: 0.02,
  playerMass: 1.2,
  raiderMass: 1,
  bruteMass: 2.2,
  bossMass: 5,
} as const;

export const SHELL = {
  speed: 640,
  life: 1.5,
  cooldown: 0.3,
  damage: 24,
} as const;

export const ENEMY = {
  raider: {
    radius: 13,
    maxHp: 48,
    speed: 118,
    accel: 360,
    hullTurnRate: 2.1,
    turretTurnRate: 3.2,
    fireCooldown: 1.35,
    damage: 10,
    preferredRange: 210,
    shots: 1,
    shotSpread: 0,
  },
  brute: {
    radius: 16,
    maxHp: 95,
    speed: 84,
    accel: 280,
    hullTurnRate: 1.55,
    turretTurnRate: 2.4,
    fireCooldown: 1.75,
    damage: 17,
    preferredRange: 170,
    shots: 1,
    shotSpread: 0,
  },
  boss: {
    radius: 21,
    maxHp: 380,
    speed: 72,
    accel: 240,
    hullTurnRate: 1.25,
    turretTurnRate: 2.1,
    fireCooldown: 1.15,
    damage: 16,
    preferredRange: 230,
    shots: 3,
    shotSpread: 0.16,
  },
  muzzleOffset: 25,
  reverseSpeedRatio: 0.55,
  friction: 5,
  hpGrowthPerWave: 0.12,
  damageGrowthPerWave: 0.07,
  maxFireRange: 520,
  fireAngleTolerance: 0.16,
  driveAngleTolerance: 1.1,
  steeringSoftness: 0.55,
  retreatRangeRatio: 0.52,
} as const;

export const WAVE = {
  maxWaves: 6,
  baseEnemies: 2,
  maxEnemies: 7,
  finalMinions: 3,
  bruteStartsAt: 3,
  salvagePerKill: 10,
  scorePerKill: 100,
} as const;

export const ARENA_PROGRESSION = {
  mediumStartsAt: 3,
  largeStartsAt: 5,
} as const;

export const PICKUP = {
  radius: 9,
  collectRadius: 24,
  dropChance: 0.24,
  dropChancePerWave: 0.025,
  maxDropChance: 0.4,
  repairAmount: 28,
  repairWeight: 5,
  repairLowArmorRatio: 0.42,
  repairLowArmorWeightMultiplier: 2,
  shieldUnlockWave: 2,
  shieldAmount: 30,
  maxShield: 60,
  shieldWeight: 3,
  overdriveUnlockWave: 3,
  overdriveDuration: 8,
  overdriveSpeedMultiplier: 1.24,
  overdriveFireCooldownMultiplier: 0.62,
  overdriveWeight: 2,
} as const;

export const EFFECT = {
  impactLife: 0.18,
  explosionLife: 0.55,
  repairLife: 0.42,
  shieldLife: 0.5,
  overdriveLife: 0.5,
} as const;

export const UPGRADE = {
  rapidFireMultiplier: 0.78,
  damageBonus: 9,
  armorBonus: 28,
  armorHeal: 28,
  speedMultiplier: 1.13,
  repairAmount: 60,
  multishotSpread: 0.11,
} as const;
