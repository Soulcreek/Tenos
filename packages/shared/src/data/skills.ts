// ============================================================
// Skill Definitions per Character Class
// ============================================================

import type { CharacterClass } from "../constants/index.js";

export type SkillType = "instant_melee" | "ranged_projectile" | "self_buff" | "heal" | "dash_melee";
export type ProjectileType = "bolt" | "arrow";

export interface SkillDef {
	id: string;
	name: string;
	type: SkillType;
	range: number;
	cooldown: number;
	manaCost: number;
	/** Damage/heal multiplier applied to relevant stat. */
	multiplier: number;
	/** Which stat scales the skill: "str" | "int" | "dex". */
	scaleStat: "str" | "int" | "dex";
	/** Whether damage is magic (uses spellPower) or physical (uses attackPower). */
	isMagic: boolean;
	/** For ranged_projectile: projectile visual type. */
	projectileType?: ProjectileType;
	/** For self_buff: buff duration in seconds. */
	buffDuration?: number;
	/** For self_buff: magnitude (e.g. 0.5 = +50%). */
	buffMagnitude?: number;
	/** For self_buff: what stat it buffs. */
	buffStat?: string;
	/** For dash_melee: ignores this % of target defense. */
	armorPen?: number;
	description: string;
}

export const SKILL_DEFS: Record<string, SkillDef> = {
	// ── Warrior ─────────────────────────────────────────────
	cleave: {
		id: "cleave",
		name: "Cleave",
		type: "instant_melee",
		range: 3.0,
		cooldown: 4,
		manaCost: 15,
		multiplier: 1.8,
		scaleStat: "str",
		isMagic: false,
		description: "A powerful sweeping strike dealing 180% ATK physical damage.",
	},
	iron_will: {
		id: "iron_will",
		name: "Iron Will",
		type: "self_buff",
		range: 0,
		cooldown: 20,
		manaCost: 25,
		multiplier: 0,
		scaleStat: "str",
		isMagic: false,
		buffDuration: 8,
		buffMagnitude: 0.5,
		buffStat: "defense",
		description: "Hardens your resolve, increasing defense by 50% for 8 seconds.",
	},

	// ── Magician ────────────────────────────────────────────
	arcane_bolt: {
		id: "arcane_bolt",
		name: "Arcane Bolt",
		type: "ranged_projectile",
		range: 18,
		cooldown: 3,
		manaCost: 20,
		multiplier: 2.0,
		scaleStat: "int",
		isMagic: true,
		projectileType: "bolt",
		description: "Fires a bolt of arcane energy dealing 200% INT magic damage.",
	},
	mend: {
		id: "mend",
		name: "Mend",
		type: "heal",
		range: 12,
		cooldown: 10,
		manaCost: 35,
		multiplier: 1.5,
		scaleStat: "int",
		isMagic: true,
		description: "Channels healing magic, restoring HP equal to 150% of INT.",
	},

	// ── Assassin ────────────────────────────────────────────
	piercing_shot: {
		id: "piercing_shot",
		name: "Piercing Shot",
		type: "ranged_projectile",
		range: 20,
		cooldown: 5,
		manaCost: 18,
		multiplier: 2.2,
		scaleStat: "dex",
		isMagic: false,
		projectileType: "arrow",
		armorPen: 0.3,
		description: "A precise shot dealing 220% DEX damage, ignoring 30% of target defense.",
	},
	shadow_strike: {
		id: "shadow_strike",
		name: "Shadow Strike",
		type: "dash_melee",
		range: 8,
		cooldown: 8,
		manaCost: 22,
		multiplier: 2.5,
		scaleStat: "dex",
		isMagic: false,
		description: "Teleport to your target and strike for 250% DEX damage.",
	},
};

/** Maps each class to its two active skill IDs [slot1, slot2]. */
export const CLASS_SKILLS: Record<CharacterClass, [string, string]> = {
	warrior: ["cleave", "iron_will"],
	magician: ["arcane_bolt", "mend"],
	assassin: ["piercing_shot", "shadow_strike"],
};
