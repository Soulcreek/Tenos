// ============================================================
// Item Catalog — Full Shinsoo Village Tier (Levels 1-15)
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
	5: {
		id: 5,
		name: "Greater Mana Draught",
		type: "consumable",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 99,
		manaAmount: 200,
		description: "Restores 200 MP.",
	},
	6: {
		id: 6,
		name: "Elixir of Vigor",
		type: "consumable",
		levelReq: 8,
		rarity: "rare",
		maxStack: 20,
		healAmount: 300,
		manaAmount: 150,
		description: "Restores 300 HP and 150 MP.",
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
	107: {
		id: 107,
		name: "Boar Tusk",
		type: "material",
		levelReq: 1,
		rarity: "common",
		maxStack: 99,
		description: "A curved tusk from a wild boar.",
	},
	108: {
		id: 108,
		name: "Spider Silk",
		type: "material",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		description: "Gossamer thread harvested from giant spiders.",
	},
	109: {
		id: 109,
		name: "Venom Sac",
		type: "material",
		levelReq: 1,
		rarity: "uncommon",
		maxStack: 99,
		description: "A toxic gland from a venomous creature.",
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

	// Warrior swords
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
	205: {
		id: 205,
		name: "Iron Broadsword",
		type: "weapon",
		subtype: "sword",
		slot: "weapon",
		classReq: "warrior",
		levelReq: 3,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 10 },
		description: "A sturdy iron blade forged in the village smithy.",
	},
	206: {
		id: 206,
		name: "Bear Slayer",
		type: "weapon",
		subtype: "sword",
		slot: "weapon",
		classReq: "warrior",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 14, critChance: 0.01 },
		description: "Heavy blade designed for cleaving through thick hides.",
	},
	207: {
		id: 207,
		name: "Shadow-Forged Greatsword",
		type: "weapon",
		subtype: "sword",
		slot: "weapon",
		classReq: "warrior",
		levelReq: 10,
		rarity: "epic",
		maxStack: 1,
		stats: { attack: 28, critChance: 0.03 },
		description: "A dark blade pulsing with corrupted energy.",
	},

	// Assassin daggers & bows
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
	208: {
		id: 208,
		name: "Rusty Shiv",
		type: "weapon",
		subtype: "dagger",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { attack: 4, critChance: 0.01 },
		description: "A crude but sharp blade. Better than bare fists.",
	},
	209: {
		id: 209,
		name: "Wolf Fang Dagger",
		type: "weapon",
		subtype: "dagger",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 11, critChance: 0.03 },
		description: "A dagger with a wolf-tooth blade, wickedly sharp.",
	},
	210: {
		id: 210,
		name: "Viper Bow",
		type: "weapon",
		subtype: "bow",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 12, critChance: 0.02 },
		description: "A recurve bow with serpent-scale limbs.",
	},
	211: {
		id: 211,
		name: "Nightfall Stiletto",
		type: "weapon",
		subtype: "dagger",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 8,
		rarity: "rare",
		maxStack: 1,
		stats: { attack: 16, critChance: 0.04 },
		description: "A slender blade forged for silent kills.",
	},
	212: {
		id: 212,
		name: "Corrupted Warbow",
		type: "weapon",
		subtype: "bow",
		slot: "weapon",
		classReq: "assassin",
		levelReq: 10,
		rarity: "epic",
		maxStack: 1,
		stats: { attack: 24, critChance: 0.05 },
		description: "A dark bow that hums with malicious intent.",
	},

	// Magician staves
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
	213: {
		id: 213,
		name: "Oak Channeler",
		type: "weapon",
		subtype: "staff",
		slot: "weapon",
		classReq: "magician",
		levelReq: 3,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 5, spellPower: 14 },
		description: "An enchanted oak staff amplifying magical flow.",
	},
	214: {
		id: 214,
		name: "Crystal-Tipped Staff",
		type: "weapon",
		subtype: "staff",
		slot: "weapon",
		classReq: "magician",
		levelReq: 6,
		rarity: "rare",
		maxStack: 1,
		stats: { attack: 6, spellPower: 22 },
		description: "A staff crowned with a glowing crystal shard.",
	},
	215: {
		id: 215,
		name: "Void Scepter",
		type: "weapon",
		subtype: "staff",
		slot: "weapon",
		classReq: "magician",
		levelReq: 10,
		rarity: "epic",
		maxStack: 1,
		stats: { attack: 8, spellPower: 35, critChance: 0.03 },
		description: "A scepter forged from dark crystal, crackling with void energy.",
	},

	// ── Armor (300-series) ──────────────────────────────────

	// Body armor
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
	305: {
		id: 305,
		name: "Reinforced Leather",
		type: "armor",
		subtype: "armor",
		slot: "armor",
		levelReq: 3,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 8 },
		description: "Studded leather armor, tougher than basic hides.",
	},
	306: {
		id: 306,
		name: "Chainmail Hauberk",
		type: "armor",
		subtype: "armor",
		slot: "armor",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 12 },
		description: "Interlocking metal rings provide solid coverage.",
	},
	307: {
		id: 307,
		name: "Shadow Robe",
		type: "armor",
		subtype: "armor",
		slot: "armor",
		classReq: "magician",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 6, spellPower: 10 },
		description: "A dark robe woven with arcane threads.",
	},

	// Helmets
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
	308: {
		id: 308,
		name: "Iron Helm",
		type: "armor",
		subtype: "helmet",
		slot: "helmet",
		levelReq: 4,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 6 },
		description: "A solid iron helmet with nose guard.",
	},
	309: {
		id: 309,
		name: "Wolf Skull Helm",
		type: "armor",
		subtype: "helmet",
		slot: "helmet",
		levelReq: 7,
		rarity: "rare",
		maxStack: 1,
		stats: { defense: 10, critChance: 0.01 },
		description: "A fearsome helm fashioned from a wolf skull.",
	},

	// Boots
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
	310: {
		id: 310,
		name: "Leather Sandals",
		type: "armor",
		subtype: "boots",
		slot: "boots",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 2, moveSpeed: 0.1 },
		description: "Simple sandals offering basic foot protection.",
	},
	311: {
		id: 311,
		name: "Shadow Treads",
		type: "armor",
		subtype: "boots",
		slot: "boots",
		levelReq: 7,
		rarity: "rare",
		maxStack: 1,
		stats: { defense: 6, moveSpeed: 0.4 },
		description: "Enchanted boots that muffle footsteps.",
	},

	// Shields
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
	312: {
		id: 312,
		name: "Iron Kite Shield",
		type: "armor",
		subtype: "shield",
		slot: "shield",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 12 },
		description: "A large iron shield offering wide coverage.",
	},
	313: {
		id: 313,
		name: "Corrupted Aegis",
		type: "armor",
		subtype: "shield",
		slot: "shield",
		levelReq: 9,
		rarity: "rare",
		maxStack: 1,
		stats: { defense: 18 },
		description: "A shield pulsing with dark protective wards.",
	},

	// ── Accessories (400-series) ────────────────────────────

	// Earrings
	400: {
		id: 400,
		name: "Copper Earring",
		type: "armor",
		slot: "earring",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 1 },
		description: "A simple copper loop earring.",
	},
	401: {
		id: 401,
		name: "Wolf Tooth Earring",
		type: "armor",
		slot: "earring",
		levelReq: 4,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 3, critChance: 0.01 },
		description: "An earring carved from a wolf's tooth.",
	},
	402: {
		id: 402,
		name: "Dark Crystal Earring",
		type: "armor",
		slot: "earring",
		levelReq: 8,
		rarity: "rare",
		maxStack: 1,
		stats: { spellPower: 8, critChance: 0.02 },
		description: "A crystalline earring humming with dark energy.",
	},

	// Bracelets
	410: {
		id: 410,
		name: "Leather Wristband",
		type: "armor",
		slot: "bracelet",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 2 },
		description: "A plain leather band worn on the wrist.",
	},
	411: {
		id: 411,
		name: "Iron Bracer",
		type: "armor",
		slot: "bracelet",
		levelReq: 4,
		rarity: "uncommon",
		maxStack: 1,
		stats: { defense: 4, attack: 2 },
		description: "A reinforced iron bracer protecting the forearm.",
	},
	412: {
		id: 412,
		name: "Venom-Laced Cuff",
		type: "armor",
		slot: "bracelet",
		levelReq: 7,
		rarity: "rare",
		maxStack: 1,
		stats: { attack: 6, critChance: 0.02 },
		description: "A bracelet coated with spider venom.",
	},

	// Necklaces
	420: {
		id: 420,
		name: "Bone Pendant",
		type: "armor",
		slot: "necklace",
		levelReq: 1,
		rarity: "common",
		maxStack: 1,
		stats: { defense: 2 },
		description: "A simple pendant carved from animal bone.",
	},
	421: {
		id: 421,
		name: "Bear Claw Necklace",
		type: "armor",
		slot: "necklace",
		levelReq: 5,
		rarity: "uncommon",
		maxStack: 1,
		stats: { attack: 4, defense: 3 },
		description: "A necklace strung with polished bear claws.",
	},
	422: {
		id: 422,
		name: "Corrupted Amulet",
		type: "armor",
		slot: "necklace",
		levelReq: 9,
		rarity: "rare",
		maxStack: 1,
		stats: { attack: 8, spellPower: 8, defense: 5 },
		description: "An amulet radiating dark power.",
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
