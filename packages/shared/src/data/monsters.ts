// ============================================================
// Monster Type Definitions
// ============================================================

export interface MonsterDef {
	id: number;
	name: string;
	level: number;
	hp: number;
	/** Physical attack power. */
	attack: number;
	/** Physical defense. */
	defense: number;
	/** Attack speed (attacks/second). */
	attackSpeed: number;
	/** Movement speed (units/second). */
	moveSpeed: number;
	/** Aggro detection range (units). */
	aggroRange: number;
	/** Max leash distance from spawn before returning (units). */
	leashRange: number;
	/** Respawn delay in seconds. */
	respawnDelay: number;
	/** XP awarded on kill. */
	xp: number;
	/** Loot table ID. */
	lootTableId: string;
	/** Visual: body color RGB. */
	color: [number, number, number];
	/** Visual: scale multiplier. */
	scale: number;
}

export const MONSTER_TYPES: Record<number, MonsterDef> = {
	1: {
		id: 1,
		name: "Wild Dog",
		level: 1,
		hp: 80,
		attack: 8,
		defense: 3,
		attackSpeed: 1.2,
		moveSpeed: 4.0,
		aggroRange: 8,
		leashRange: 20,
		respawnDelay: 15,
		xp: 25,
		lootTableId: "wild_dog",
		color: [0.6, 0.4, 0.2],
		scale: 0.7,
	},
	2: {
		id: 2,
		name: "Forest Wolf",
		level: 3,
		hp: 150,
		attack: 15,
		defense: 6,
		attackSpeed: 1.0,
		moveSpeed: 4.5,
		aggroRange: 10,
		leashRange: 25,
		respawnDelay: 20,
		xp: 60,
		lootTableId: "forest_wolf",
		color: [0.5, 0.5, 0.55],
		scale: 0.85,
	},
	3: {
		id: 3,
		name: "Brown Bear",
		level: 5,
		hp: 300,
		attack: 25,
		defense: 12,
		attackSpeed: 0.7,
		moveSpeed: 3.0,
		aggroRange: 6,
		leashRange: 15,
		respawnDelay: 30,
		xp: 120,
		lootTableId: "brown_bear",
		color: [0.45, 0.3, 0.15],
		scale: 1.2,
	},
	4: {
		id: 4,
		name: "Bandit Scout",
		level: 7,
		hp: 200,
		attack: 30,
		defense: 10,
		attackSpeed: 1.3,
		moveSpeed: 4.2,
		aggroRange: 12,
		leashRange: 25,
		respawnDelay: 25,
		xp: 180,
		lootTableId: "bandit_scout",
		color: [0.7, 0.2, 0.2],
		scale: 0.95,
	},
	5: {
		id: 5,
		name: "Corrupted Tiger",
		level: 10,
		hp: 500,
		attack: 45,
		defense: 18,
		attackSpeed: 0.9,
		moveSpeed: 5.0,
		aggroRange: 14,
		leashRange: 30,
		respawnDelay: 45,
		xp: 350,
		lootTableId: "corrupted_tiger",
		color: [0.3, 0.1, 0.5],
		scale: 1.1,
	},
};
