// ============================================================
// Loot Table Definitions
// ============================================================

export interface LootEntry {
	/** Item ID. */
	itemId: number;
	/** Item name (for display). */
	name: string;
	/** Drop chance (0-1). */
	chance: number;
	/** Min quantity. */
	minQty: number;
	/** Max quantity. */
	maxQty: number;
}

export interface LootTable {
	id: string;
	entries: LootEntry[];
	/** Yang (gold) drop range. */
	yangMin: number;
	yangMax: number;
}

// Item IDs:
// 1-99: Consumables
// 100-199: Materials
// 200-299: Weapons
// 300-399: Armor
// 400-499: Accessories

export const LOOT_TABLES: Record<string, LootTable> = {
	wild_dog: {
		id: "wild_dog",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.4, minQty: 1, maxQty: 2 },
			{ itemId: 100, name: "Animal Skin", chance: 0.3, minQty: 1, maxQty: 1 },
			{ itemId: 101, name: "Fang", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 400, name: "Copper Earring", chance: 0.03, minQty: 1, maxQty: 1 },
		],
		yangMin: 10,
		yangMax: 30,
	},
	wild_boar: {
		id: "wild_boar",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.35, minQty: 1, maxQty: 2 },
			{ itemId: 100, name: "Animal Skin", chance: 0.35, minQty: 1, maxQty: 2 },
			{ itemId: 107, name: "Boar Tusk", chance: 0.2, minQty: 1, maxQty: 1 },
			{ itemId: 310, name: "Leather Sandals", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 420, name: "Bone Pendant", chance: 0.04, minQty: 1, maxQty: 1 },
		],
		yangMin: 15,
		yangMax: 40,
	},
	forest_wolf: {
		id: "forest_wolf",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.35, minQty: 1, maxQty: 3 },
			{ itemId: 2, name: "Medium Potion", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 100, name: "Animal Skin", chance: 0.4, minQty: 1, maxQty: 2 },
			{ itemId: 102, name: "Wolf Pelt", chance: 0.2, minQty: 1, maxQty: 1 },
			{ itemId: 205, name: "Iron Broadsword", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 401, name: "Wolf Tooth Earring", chance: 0.05, minQty: 1, maxQty: 1 },
		],
		yangMin: 25,
		yangMax: 60,
	},
	giant_spider: {
		id: "giant_spider",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 2, name: "Medium Potion", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 108, name: "Spider Silk", chance: 0.25, minQty: 1, maxQty: 2 },
			{ itemId: 109, name: "Venom Sac", chance: 0.12, minQty: 1, maxQty: 1 },
			{ itemId: 209, name: "Wolf Fang Dagger", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 410, name: "Leather Wristband", chance: 0.06, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.04, minQty: 1, maxQty: 1 },
		],
		yangMin: 35,
		yangMax: 80,
	},
	brown_bear: {
		id: "brown_bear",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 100, name: "Animal Skin", chance: 0.5, minQty: 2, maxQty: 3 },
			{ itemId: 103, name: "Bear Claw", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 200, name: "Worn Sword", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 206, name: "Bear Slayer", chance: 0.03, minQty: 1, maxQty: 1 },
			{ itemId: 306, name: "Chainmail Hauberk", chance: 0.03, minQty: 1, maxQty: 1 },
			{ itemId: 421, name: "Bear Claw Necklace", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.05, minQty: 1, maxQty: 1 },
		],
		yangMin: 50,
		yangMax: 120,
	},
	bandit_archer: {
		id: "bandit_archer",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 104, name: "Bandit Badge", chance: 0.2, minQty: 1, maxQty: 1 },
			{ itemId: 210, name: "Viper Bow", chance: 0.06, minQty: 1, maxQty: 1 },
			{ itemId: 305, name: "Reinforced Leather", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 308, name: "Iron Helm", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 411, name: "Iron Bracer", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.06, minQty: 1, maxQty: 1 },
		],
		yangMin: 60,
		yangMax: 140,
	},
	bandit_scout: {
		id: "bandit_scout",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.35, minQty: 1, maxQty: 2 },
			{ itemId: 3, name: "Large Potion", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 104, name: "Bandit Badge", chance: 0.2, minQty: 1, maxQty: 1 },
			{ itemId: 201, name: "Bandit Dagger", chance: 0.08, minQty: 1, maxQty: 1 },
			{ itemId: 300, name: "Leather Armor", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 213, name: "Oak Channeler", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 312, name: "Iron Kite Shield", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.08, minQty: 1, maxQty: 1 },
			{ itemId: 111, name: "Radiant Imbue Stone", chance: 0.02, minQty: 1, maxQty: 1 },
		],
		yangMin: 80,
		yangMax: 180,
	},
	dire_wolf: {
		id: "dire_wolf",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 3, name: "Large Potion", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 102, name: "Wolf Pelt", chance: 0.4, minQty: 1, maxQty: 3 },
			{ itemId: 211, name: "Nightfall Stiletto", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 309, name: "Wolf Skull Helm", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 311, name: "Shadow Treads", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 412, name: "Venom-Laced Cuff", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.08, minQty: 1, maxQty: 1 },
			{ itemId: 111, name: "Radiant Imbue Stone", chance: 0.03, minQty: 1, maxQty: 1 },
		],
		yangMin: 100,
		yangMax: 220,
	},
	corrupted_tiger: {
		id: "corrupted_tiger",
		entries: [
			{ itemId: 3, name: "Large Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 6, name: "Elixir of Vigor", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 105, name: "Corrupted Fang", chance: 0.25, minQty: 1, maxQty: 1 },
			{ itemId: 106, name: "Dark Crystal", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 202, name: "Tiger Claw Blade", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 301, name: "Corrupted Plate", chance: 0.03, minQty: 1, maxQty: 1 },
			{ itemId: 214, name: "Crystal-Tipped Staff", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 402, name: "Dark Crystal Earring", chance: 0.04, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 111, name: "Radiant Imbue Stone", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 112, name: "Warding Seal", chance: 0.01, minQty: 1, maxQty: 1 },
		],
		yangMin: 150,
		yangMax: 350,
	},
	bandit_captain: {
		id: "bandit_captain",
		entries: [
			{ itemId: 3, name: "Large Potion", chance: 0.5, minQty: 2, maxQty: 3 },
			{ itemId: 6, name: "Elixir of Vigor", chance: 0.2, minQty: 1, maxQty: 2 },
			{ itemId: 104, name: "Bandit Badge", chance: 0.5, minQty: 2, maxQty: 4 },
			{ itemId: 106, name: "Dark Crystal", chance: 0.15, minQty: 1, maxQty: 2 },
			{ itemId: 207, name: "Shadow-Forged Greatsword", chance: 0.06, minQty: 1, maxQty: 1 },
			{ itemId: 212, name: "Corrupted Warbow", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 215, name: "Void Scepter", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 313, name: "Corrupted Aegis", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 422, name: "Corrupted Amulet", chance: 0.06, minQty: 1, maxQty: 1 },
			{ itemId: 110, name: "Imbue Stone", chance: 0.2, minQty: 1, maxQty: 2 },
			{ itemId: 111, name: "Radiant Imbue Stone", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 112, name: "Warding Seal", chance: 0.03, minQty: 1, maxQty: 1 },
		],
		yangMin: 300,
		yangMax: 700,
	},
};

/** Roll loot from a loot table. Returns the items that dropped. */
export function rollLoot(tableId: string): Array<{ itemId: number; name: string; qty: number }> {
	const table = LOOT_TABLES[tableId];
	if (!table) return [];

	const drops: Array<{ itemId: number; name: string; qty: number }> = [];

	for (const entry of table.entries) {
		if (Math.random() < entry.chance) {
			const qty = entry.minQty + Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1));
			drops.push({ itemId: entry.itemId, name: entry.name, qty });
		}
	}

	return drops;
}
