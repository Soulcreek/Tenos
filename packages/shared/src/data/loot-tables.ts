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

export const LOOT_TABLES: Record<string, LootTable> = {
	wild_dog: {
		id: "wild_dog",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.4, minQty: 1, maxQty: 2 },
			{ itemId: 100, name: "Animal Skin", chance: 0.3, minQty: 1, maxQty: 1 },
			{ itemId: 101, name: "Fang", chance: 0.1, minQty: 1, maxQty: 1 },
		],
		yangMin: 10,
		yangMax: 30,
	},
	forest_wolf: {
		id: "forest_wolf",
		entries: [
			{ itemId: 1, name: "Small Potion", chance: 0.35, minQty: 1, maxQty: 3 },
			{ itemId: 2, name: "Medium Potion", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 100, name: "Animal Skin", chance: 0.4, minQty: 1, maxQty: 2 },
			{ itemId: 102, name: "Wolf Pelt", chance: 0.2, minQty: 1, maxQty: 1 },
		],
		yangMin: 25,
		yangMax: 60,
	},
	brown_bear: {
		id: "brown_bear",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 100, name: "Animal Skin", chance: 0.5, minQty: 2, maxQty: 3 },
			{ itemId: 103, name: "Bear Claw", chance: 0.15, minQty: 1, maxQty: 1 },
			{ itemId: 200, name: "Worn Sword", chance: 0.05, minQty: 1, maxQty: 1 },
		],
		yangMin: 50,
		yangMax: 120,
	},
	bandit_scout: {
		id: "bandit_scout",
		entries: [
			{ itemId: 2, name: "Medium Potion", chance: 0.35, minQty: 1, maxQty: 2 },
			{ itemId: 3, name: "Large Potion", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 104, name: "Bandit Badge", chance: 0.2, minQty: 1, maxQty: 1 },
			{ itemId: 201, name: "Bandit Dagger", chance: 0.08, minQty: 1, maxQty: 1 },
			{ itemId: 300, name: "Leather Armor", chance: 0.05, minQty: 1, maxQty: 1 },
		],
		yangMin: 80,
		yangMax: 180,
	},
	corrupted_tiger: {
		id: "corrupted_tiger",
		entries: [
			{ itemId: 3, name: "Large Potion", chance: 0.3, minQty: 1, maxQty: 2 },
			{ itemId: 105, name: "Corrupted Fang", chance: 0.25, minQty: 1, maxQty: 1 },
			{ itemId: 106, name: "Dark Crystal", chance: 0.1, minQty: 1, maxQty: 1 },
			{ itemId: 202, name: "Tiger Claw Blade", chance: 0.05, minQty: 1, maxQty: 1 },
			{ itemId: 301, name: "Corrupted Plate", chance: 0.03, minQty: 1, maxQty: 1 },
		],
		yangMin: 150,
		yangMax: 350,
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
