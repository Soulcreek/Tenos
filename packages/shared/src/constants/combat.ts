// ============================================================
// Combat Constants & Formulas
// ============================================================

/** Melee auto-attack range in world units. */
export const MELEE_RANGE = 2.5;

/** Critical hit damage multiplier. */
export const CRIT_MULTIPLIER = 2.0;

/** Base attack speed (attacks per second). */
export const BASE_ATTACK_SPEED = 1.0;

/** HP regen per VIT point per second. */
export const HP_REGEN_PER_VIT = 0.5;

/** MP regen per INT point per second. */
export const MP_REGEN_PER_INT = 0.3;

/** HP per VIT point. */
export const HP_PER_VIT = 10;

/** MP per INT point. */
export const MP_PER_INT = 8;

/** Base HP at level 1. */
export const BASE_HP = 100;

/** Base MP at level 1. */
export const BASE_MP = 50;

/** Attack power per STR point. */
export const ATTACK_PER_STR = 2.0;

/** Defense per VIT point. */
export const DEFENSE_PER_VIT = 1.5;

/** Critical chance per DEX point (%). */
export const CRIT_PER_DEX = 0.003;

/** Base crit chance. */
export const BASE_CRIT_CHANCE = 0.05;

/** Attack speed bonus per DEX point. */
export const ATTACK_SPEED_PER_DEX = 0.01;

/** Move speed bonus per DEX point. */
export const MOVE_SPEED_PER_DEX = 0.005;

/** Base move speed (units/second). */
export const BASE_MOVE_SPEED = 5.0;

/** Minimum damage (even vs very high defense). */
export const MIN_DAMAGE = 1;

/** Player respawn delay in seconds. */
export const PLAYER_RESPAWN_DELAY = 5.0;

/** Loot despawn timer in seconds. */
export const LOOT_DESPAWN_TIME = 60.0;

/** Loot owner protection time in seconds (only killer can pick up). */
export const LOOT_OWNER_TIME = 30.0;

/** XP penalty on death: percentage of current level XP lost. */
export const XP_DEATH_PENALTY_PCT = 0.05;

/** Monster chase speed multiplier (relative to base move speed). */
export const MONSTER_CHASE_SPEED = 0.8;

/** Monster attack range. */
export const MONSTER_ATTACK_RANGE = 2.0;

// ── Derived Stat Calculations ──────────────────────────────────

export interface DerivedStats {
	hpMax: number;
	mpMax: number;
	hpRegen: number;
	mpRegen: number;
	attackPower: number;
	defense: number;
	attackSpeed: number;
	critChance: number;
	moveSpeed: number;
}

/** Recalculate all derived stats from base stats. */
export function recalculateDerivedStats(
	str: number,
	dex: number,
	int: number,
	vit: number,
	level: number,
): DerivedStats {
	return {
		hpMax: BASE_HP + vit * HP_PER_VIT + level * 5,
		mpMax: BASE_MP + int * MP_PER_INT + level * 3,
		hpRegen: vit * HP_REGEN_PER_VIT,
		mpRegen: int * MP_REGEN_PER_INT,
		attackPower: str * ATTACK_PER_STR + level * 1.5,
		defense: vit * DEFENSE_PER_VIT + level * 0.5,
		attackSpeed: BASE_ATTACK_SPEED + dex * ATTACK_SPEED_PER_DEX,
		critChance: Math.min(0.5, BASE_CRIT_CHANCE + dex * CRIT_PER_DEX),
		moveSpeed: BASE_MOVE_SPEED + dex * MOVE_SPEED_PER_DEX,
	};
}

/**
 * Calculate physical damage.
 * Formula: attackPower * (1 - defense / (defense + 100)) * random variance
 * Minimum damage is always MIN_DAMAGE.
 */
export function calculatePhysicalDamage(
	attackPower: number,
	defense: number,
	isCrit: boolean,
): number {
	const reduction = defense / (defense + 100);
	const baseDamage = attackPower * (1 - reduction);
	const variance = 0.85 + Math.random() * 0.3; // 85%-115%
	let damage = Math.floor(baseDamage * variance);
	if (isCrit) damage = Math.floor(damage * CRIT_MULTIPLIER);
	return Math.max(MIN_DAMAGE, damage);
}

/**
 * Calculate XP penalty on death.
 * Loses a percentage of XP needed for current level.
 */
export function calculateXPPenalty(currentXP: number, xpForCurrentLevel: number): number {
	const penalty = Math.floor(xpForCurrentLevel * XP_DEATH_PENALTY_PCT);
	return Math.max(0, currentXP - penalty);
}
