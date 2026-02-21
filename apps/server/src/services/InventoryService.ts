import {
	type CharacterClass,
	type EquipSlot,
	type EquipmentSlots,
	ITEM_CATALOG,
	type InventorySlot,
	MAX_INVENTORY_SLOTS,
	WARDING_SEAL_ID,
	calculateEquipmentStats,
	calculateUpgradeResult,
	createEmptyEquipment,
	findEmptySlot,
	findStackSlot,
	getDowngradedLevel,
	getUpgradeEntry,
	isConsumable,
	isEquippable,
} from "@tenos/shared";

interface PlayerInventory {
	slots: (InventorySlot | null)[];
	equipment: EquipmentSlots;
	yang: number;
}

const inventories = new Map<string, PlayerInventory>();

export function initInventory(
	sessionId: string,
	slots?: (InventorySlot | null)[],
	equipment?: EquipmentSlots,
	yang?: number,
) {
	const inv: PlayerInventory = {
		slots: slots ?? new Array(MAX_INVENTORY_SLOTS).fill(null),
		equipment: equipment ?? createEmptyEquipment(),
		yang: yang ?? 0,
	};
	inventories.set(sessionId, inv);
}

export function getInventory(sessionId: string): PlayerInventory | undefined {
	return inventories.get(sessionId);
}

export function removeInventory(sessionId: string) {
	inventories.delete(sessionId);
}

export function addItem(sessionId: string, itemId: number, qty: number, upgradeLevel = 0): boolean {
	const inv = inventories.get(sessionId);
	if (!inv) return false;
	const item = ITEM_CATALOG[itemId];
	if (!item) return false;

	let remaining = qty;

	// Try stacking first
	if (item.maxStack > 1 && upgradeLevel === 0) {
		while (remaining > 0) {
			const stackIdx = findStackSlot(inv.slots, itemId);
			if (stackIdx === -1) break;
			const slot = inv.slots[stackIdx];
			if (!slot) break;
			const canAdd = Math.min(remaining, item.maxStack - slot.quantity);
			slot.quantity += canAdd;
			remaining -= canAdd;
		}
	}

	// Fill empty slots
	while (remaining > 0) {
		const emptyIdx = findEmptySlot(inv.slots);
		if (emptyIdx === -1) return false; // Inventory full
		const stackSize = item.maxStack > 1 ? Math.min(remaining, item.maxStack) : 1;
		inv.slots[emptyIdx] = { itemId, quantity: stackSize, upgradeLevel };
		remaining -= stackSize;
	}

	return true;
}

export function removeItem(sessionId: string, slotIdx: number, qty: number): boolean {
	const inv = inventories.get(sessionId);
	if (!inv) return false;
	const slot = inv.slots[slotIdx];
	if (!slot) return false;
	if (slot.quantity < qty) return false;

	slot.quantity -= qty;
	if (slot.quantity <= 0) {
		inv.slots[slotIdx] = null;
	}
	return true;
}

export function equipItem(
	sessionId: string,
	invSlotIdx: number,
	characterClass: CharacterClass,
	level: number,
): { success: boolean; unequipped?: InventorySlot } {
	const inv = inventories.get(sessionId);
	if (!inv) return { success: false };

	const slot = inv.slots[invSlotIdx];
	if (!slot) return { success: false };

	const item = ITEM_CATALOG[slot.itemId];
	if (!item || !item.slot) return { success: false };

	// Check class requirement
	if (item.classReq && item.classReq !== characterClass) return { success: false };
	// Check level requirement
	if (level < item.levelReq) return { success: false };

	const equipSlot = item.slot as EquipSlot;
	const currentEquip = inv.equipment[equipSlot];

	// Swap: put currently equipped item back in inventory
	if (currentEquip) {
		inv.slots[invSlotIdx] = currentEquip;
	} else {
		inv.slots[invSlotIdx] = null;
	}

	inv.equipment[equipSlot] = { itemId: slot.itemId, quantity: 1, upgradeLevel: slot.upgradeLevel };

	return { success: true, unequipped: currentEquip ?? undefined };
}

export function unequipItem(sessionId: string, equipSlot: string): boolean {
	const inv = inventories.get(sessionId);
	if (!inv) return false;

	const validSlots: EquipSlot[] = [
		"weapon",
		"helmet",
		"armor",
		"boots",
		"shield",
		"earring",
		"bracelet",
		"necklace",
	];
	if (!validSlots.includes(equipSlot as EquipSlot)) return false;

	const current = inv.equipment[equipSlot as EquipSlot];
	if (!current) return false;

	const emptyIdx = findEmptySlot(inv.slots);
	if (emptyIdx === -1) return false; // Inventory full

	inv.slots[emptyIdx] = current;
	inv.equipment[equipSlot as EquipSlot] = null;
	return true;
}

export function useItem(
	sessionId: string,
	invSlotIdx: number,
): { healAmount: number; manaAmount: number } | null {
	const inv = inventories.get(sessionId);
	if (!inv) return null;

	const slot = inv.slots[invSlotIdx];
	if (!slot) return null;

	const item = ITEM_CATALOG[slot.itemId];
	if (!item || !isConsumable(slot.itemId)) return null;

	const result = {
		healAmount: item.healAmount ?? 0,
		manaAmount: item.manaAmount ?? 0,
	};

	// Consume one
	slot.quantity -= 1;
	if (slot.quantity <= 0) {
		inv.slots[invSlotIdx] = null;
	}

	return result;
}

export interface UpgradeAttemptResult {
	success: boolean;
	newLevel: number;
	destroyed: boolean;
	itemName: string;
}

export function upgradeItem(
	sessionId: string,
	invSlotIdx: number,
	useWardingSeal: boolean,
): UpgradeAttemptResult | null {
	const inv = inventories.get(sessionId);
	if (!inv) return null;

	const slot = inv.slots[invSlotIdx];
	if (!slot) return null;

	const item = ITEM_CATALOG[slot.itemId];
	if (!item || !isEquippable(slot.itemId)) return null;

	const entry = getUpgradeEntry(slot.upgradeLevel);
	if (!entry) return null;

	// Check material
	const matSlotIdx = inv.slots.findIndex((s) => s && s.itemId === entry.materialId);
	if (matSlotIdx === -1) return null;

	// Check warding seal if requested
	let wardingSealSlotIdx = -1;
	if (useWardingSeal) {
		wardingSealSlotIdx = inv.slots.findIndex((s) => s && s.itemId === WARDING_SEAL_ID);
		if (wardingSealSlotIdx === -1) return null;
	}

	// Consume material
	removeItem(sessionId, matSlotIdx, 1);
	if (useWardingSeal && wardingSealSlotIdx !== -1) {
		// Re-find the warding seal slot in case indices shifted (they don't, but be safe)
		const wsSlot = inv.slots.findIndex((s) => s && s.itemId === WARDING_SEAL_ID);
		if (wsSlot !== -1) removeItem(sessionId, wsSlot, 1);
	}

	const result = calculateUpgradeResult(slot.upgradeLevel, useWardingSeal);

	switch (result) {
		case "success":
			slot.upgradeLevel += 1;
			return { success: true, newLevel: slot.upgradeLevel, destroyed: false, itemName: item.name };
		case "fail":
			return { success: false, newLevel: slot.upgradeLevel, destroyed: false, itemName: item.name };
		case "downgrade": {
			slot.upgradeLevel = getDowngradedLevel(slot.upgradeLevel);
			return { success: false, newLevel: slot.upgradeLevel, destroyed: false, itemName: item.name };
		}
		case "destroy":
			inv.slots[invSlotIdx] = null;
			return { success: false, newLevel: 0, destroyed: true, itemName: item.name };
	}
}

export function dropItem(
	sessionId: string,
	invSlotIdx: number,
	qty: number,
): { itemId: number; qty: number; upgradeLevel: number } | null {
	const inv = inventories.get(sessionId);
	if (!inv) return null;

	const slot = inv.slots[invSlotIdx];
	if (!slot) return null;

	const dropQty = Math.min(qty, slot.quantity);
	const result = { itemId: slot.itemId, qty: dropQty, upgradeLevel: slot.upgradeLevel };

	slot.quantity -= dropQty;
	if (slot.quantity <= 0) {
		inv.slots[invSlotIdx] = null;
	}

	return result;
}

export function getEquipmentBonuses(sessionId: string) {
	const inv = inventories.get(sessionId);
	if (!inv) return { attack: 0, defense: 0, spellPower: 0, critChance: 0, moveSpeed: 0 };
	return calculateEquipmentStats(inv.equipment);
}

export function addYang(sessionId: string, amount: number) {
	const inv = inventories.get(sessionId);
	if (inv) inv.yang += amount;
}
