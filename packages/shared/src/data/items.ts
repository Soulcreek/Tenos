// ============================================================
// Item Catalog — ~20 starter items
// ============================================================

import type { CharacterClass } from "../constants/index.js";

export type ItemType = "weapon" | "armor" | "consumable" | "material";
export type WeaponSubtype = "sword" | "dagger" | "staff" | "bow";
export type ArmorSlot = "armor" | "helmet" | "boots" | "shield";
export type EquipSlot =
	| "weapon"
	| "helmet"
	| "armor"
	| "boots"
	| "shield"
	| "earring"
	| "bracelet"
	| "necklace";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface ItemStats {
	attack?: number;
	defense?: number;
	spellPower?: number;
	critChance?: number;
	moveSpeed?: number;
}

export interface ItemDef {
	id: number;
	name: string;
	type: ItemType;
	subtype?: WeaponSubtype | ArmorSlot;
	slot?: EquipSlot;
	classReq?: CharacterClass;
	levelReq: number;
	rarity: ItemRarity;
	maxStack: number;
	stats?: ItemStats;
	healAmount?: number;
	manaAmount?: number;
	description: string;
}

export const ITEM_CATALOG: Record<number, ItemDef> = {
	// ── Consumables (1-series) ──────────────────────────────
	1: {
		id: 1,
		name: "Small Potion",
		type: "consumable",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		healAmount: 50,
		description: "Restores 50 HP.",
	},
	2: {
		id: 2,
		name: "Medium Potion",
		type: "consumable",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		healAmount: 150,
		description: "Restores 150 HP.",
	},
	3: {
		id: 3,
		name: "Large Potion",
		type: "consumable",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		healAmount: 400,
		description: "Restores 400 HP.",
	},
	4: {
		id: 4,
		name: "Mana Draught",
		type: "consumable",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		manaAmount: 80,
		description: "Restores 80 MP.",
	},

	// ── Materials (100-series) ──────────────────────────────
	100: {
		id: 100,
		name: "Animal Skin",
		type: "material",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		description: "A rough piece of animal hide.",
	},
	101: {
		id: 101,
		name: "Fang",
		type: "material",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		description: "A sharp tooth from a wild creature.",
	},
	102: {
		id: 102,
		name: "Wolf Pelt",
		type: "material",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		description: "Thick wolf fur, prized by leatherworkers.",
	},
	103: {
		id: 103,
		name: "Bear Claw",
		type: "material",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		description: "A massive claw from a brown bear.",
	},
	104: {
		id: 104,
		name: "Bandit Badge",
		type: "material",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		description: "An insignia carried by bandits.",
	},
	105: {
		id: 105,
		name: "Corrupted Fang",
		type: "material",
		levelReq: 1,
		rarity: "rare",
		maxStack: 99,
		description: "A fang pulsing with dark energy.",
	},
	106: {
		id: 106,
		name: "Dark Crystal",
		type: "material",
		levelReq: 1,
		rarity: "rare",
		maxStack: 99,
		description: "A shard of crystallized corruption.",
	},
	110: {
		id: 110,
		name: "Imbue Stone",
		type: "material",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		description: "Used to upgrade equipment from +1 to +7.",
	},
	111: {
		id: 111,
		name: "Radiant Imbue Stone",
		type: "material",
		levelReq: 1,
		rarity: "rare",
		maxStack: 99,
		description: "Used to upgrade equipment from +8 to +15.",
	},
	112: {
		id: 112,
		name: "Warding Seal",
		type: "material",
		levelReq: 1,
		rarity: "epic",
		maxStack: 99,
		description: "Prevents item destruction on failed upgrades (+13-15).",
	},

	// ── Weapons (200-series) ────────────────────────────────
	200: {
		id: 200,
		name: "Worn Sword",
		type: "weapon",
		subtype: "sword",
		slot: "weapon",
		classReq: "warrior",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { attack: 5 },
		description: "A battered but serviceable blade.",
	},
	201: {
		id: 201,
		name: "Bandit Dagger",
		type: "weapon",
		subtype: "dagger",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 3,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 8, critChance: 0.02 },
		description: "A swift blade favored by bandits.",
	},
	202: {
		id: 202,
		name: "Tiger Claw Blade",
		type: "weapon",
		subtype: "sword",
		slot: "weapon",
		classReq: "warrior",
		levelReq: 7,
		rarity: "rare",
		maxStack: 1,
		stats: { attack: 18 },
		description: "A curved sword carved from tiger bone.",
	},
	203: {
		id: 203,
		name: "Willow Staff",
		type: "weapon",
		subtype: "staff",
		slot: "weapon",
		classReq: "magician",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { attack: 4, spellPower: 8 },
		description: "A gnarled staff channeling faint arcane energy.",
	},
	204: {
		id: 204,
		name: "Elm Longbow",
		type: "weapon",
		subtype: "bow",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { attack: 6 },
		description: "A simple but reliable longbow.",
	},

	// ── Armor (300-series) ──────────────────────────────────
	300: {
		id: 300,
		name: "Leather Armor",
		type: "armor",
		subtype: "armor",
		slot: "armor",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 5 },
		description: "Basic leather armor offering modest protection.",
	},
	301: {
		id: 301,
		name: "Corrupted Plate",
		type: "armor",
		subtype: "armor",
		slot: "armor",
		levelReq: 7,
		rarity: "rare",
		maxStack: 1,
		stats: { defense: 15 },
		description: "Dark-infused plate armor with formidable defense.",
	},
	302: {
		id: 302,
		name: "Hide Cap",
		type: "armor",
		subtype: "helmet",
		slot: "helmet",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 3 },
		description: "A simple cap made from animal hide.",
	},
	303: {
		id: 303,
		name: "Iron Greaves",
		type: "armor",
		subtype: "boots",
		slot: "boots",
		levelReq: 3,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 4, moveSpeed: 0.2 },
		description: "Sturdy iron boots that quicken your step.",
	},
	304: {
		id: 304,
		name: "Wooden Buckler",
		type: "armor",
		subtype: "shield",
		slot: "shield",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 6 },
		description: "A small wooden shield for basic blocking.",
	},
};

/** Check if an item is equippable. */
export function isEquippable(itemId: number): boolean {
	const item = ITEM_CATALOG[itemId];
	return item != null && item.slot != null;
}

/** Check if an item is consumable. */
export function isConsumable(itemId: number): boolean {
	const item = ITEM_CATALOG[itemId];
	return item != null && item.type === "consumable";
}

/** Get weapon subtype for visual rendering. */
export function getWeaponSubtype(itemId: number): WeaponSubtype | null {
	const item = ITEM_CATALOG[itemId];
	if (item?.type === "weapon" && item.subtype) return item.subtype as WeaponSubtype;
	return null;
}
