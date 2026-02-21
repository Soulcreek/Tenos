// ============================================================
// Inventory Types & Utility Functions
// ============================================================

import { MAX_INVENTORY_SLOTS } from "../constants/index.js";
import { type EquipSlot, ITEM_CATALOG, type ItemStats } from "./items.js";

export interface InventorySlot {
	itemId: number;
	quantity: number;
	upgradeLevel: number;
}

export interface EquipmentSlots {
	weapon: InventorySlot | null;
	helmet: InventorySlot | null;
	armor: InventorySlot | null;
	boots: InventorySlot | null;
	shield: InventorySlot | null;
	earring: InventorySlot | null;
	bracelet: InventorySlot | null;
	necklace: InventorySlot | null;
}

export const EMPTY_EQUIPMENT: EquipmentSlots = {
	weapon: null,
	helmet: null,
	armor: null,
	boots: null,
	shield: null,
	earring: null,
	bracelet: null,
	necklace: null,
};

export function createEmptyEquipment(): EquipmentSlots {
	return { ...EMPTY_EQUIPMENT };
}

/** Check if an item can stack with existing items. */
export function canStackItem(itemId: number): boolean {
	const item = ITEM_CATALOG[itemId];
	return item != null && item.maxStack > 1;
}

/** Find first empty slot in inventory array. Returns -1 if full. */
export function findEmptySlot(inventory: (InventorySlot | null)[]): number {
	for (let i = 0; i < Math.min(inventory.length, MAX_INVENTORY_SLOTS); i++) {
		if (inventory[i] == null) return i;
	}
	return -1;
}

/** Find a slot containing a stackable item with room. Returns -1 if none. */
export function findStackSlot(inventory: (InventorySlot | null)[], itemId: number): number {
	const item = ITEM_CATALOG[itemId];
	if (!item || item.maxStack <= 1) return -1;
	for (let i = 0; i < Math.min(inventory.length, MAX_INVENTORY_SLOTS); i++) {
		const slot = inventory[i];
		if (slot && slot.itemId === itemId && slot.quantity < item.maxStack) return i;
	}
	return -1;
}

/** Calculate stat bonus per upgrade level. */
function upgradeStatBonus(baseStat: number, upgradeLevel: number): number {
	if (upgradeLevel <= 0) return baseStat;
	return Math.floor(baseStat * (1 + upgradeLevel * 0.15));
}

/** Sum all equipment stats including upgrade bonuses. */
export function calculateEquipmentStats(equipment: EquipmentSlots): ItemStats {
	const total: Required<ItemStats> = {
		attack: 0,
		defense: 0,
		spellPower: 0,
		critChance: 0,
		moveSpeed: 0,
	};

	const slots: EquipSlot[] = [
		"weapon",
		"helmet",
		"armor",
		"boots",
		"shield",
		"earring",
		"bracelet",
		"necklace",
	];
	for (const slotName of slots) {
		const slot = equipment[slotName];
		if (!slot) continue;
		const item = ITEM_CATALOG[slot.itemId];
		if (!item?.stats) continue;

		if (item.stats.attack) total.attack += upgradeStatBonus(item.stats.attack, slot.upgradeLevel);
		if (item.stats.defense)
			total.defense += upgradeStatBonus(item.stats.defense, slot.upgradeLevel);
		if (item.stats.spellPower)
			total.spellPower += upgradeStatBonus(item.stats.spellPower, slot.upgradeLevel);
		if (item.stats.critChance) total.critChance += item.stats.critChance;
		if (item.stats.moveSpeed) total.moveSpeed += item.stats.moveSpeed;
	}

	return total;
}
