import type { EquipSlot, EquipmentSlots, InventorySlot } from "@tenos/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { characters, equippedItems, inventoryItems, players } from "../db/schema.js";

export interface CharacterData {
	id: number;
	playerId: number;
	name: string;
	characterClass: string;
	zone: string;
	posX: number;
	posY: number;
	posZ: number;
	level: number;
	xp: number;
	statPoints: number;
	str: number;
	dex: number;
	intStat: number;
	vit: number;
	hpCurrent: number;
	mpCurrent: number;
}

export interface CharacterSaveData {
	characterId: number;
	zone: string;
	posX: number;
	posY: number;
	posZ: number;
	level: number;
	xp: number;
	statPoints: number;
	str: number;
	dex: number;
	intStat: number;
	vit: number;
	hpCurrent: number;
	mpCurrent: number;
}

/** Find player by username or create a new one. Updates lastLoginAt. Returns player id. */
export async function findOrCreatePlayer(username: string): Promise<number> {
	const existing = await db.query.players.findFirst({
		where: eq(players.username, username),
	});

	if (existing) {
		await db.update(players).set({ lastLoginAt: new Date() }).where(eq(players.id, existing.id));
		return existing.id;
	}

	const [inserted] = await db
		.insert(players)
		.values({
			username,
			displayName: username,
			lastLoginAt: new Date(),
		})
		.returning({ id: players.id });

	return inserted.id;
}

/** Load the first character for a player (MVP: 1 char per account). Returns null if none. */
export async function loadCharacter(playerId: number): Promise<CharacterData | null> {
	const row = await db.query.characters.findFirst({
		where: eq(characters.playerId, playerId),
	});

	if (!row) return null;

	return {
		id: row.id,
		playerId: row.playerId,
		name: row.name,
		characterClass: row.characterClass,
		zone: row.zone,
		posX: row.posX,
		posY: row.posY,
		posZ: row.posZ,
		level: row.level,
		xp: row.xp,
		statPoints: row.statPoints,
		str: row.str,
		dex: row.dex,
		intStat: row.intStat,
		vit: row.vit,
		hpCurrent: row.hpCurrent,
		mpCurrent: row.mpCurrent,
	};
}

/** Create a new character with the given base stats. */
export async function createCharacter(
	playerId: number,
	name: string,
	characterClass: string,
	baseStats: { str: number; dex: number; int: number; vit: number },
	hpMax: number,
	mpMax: number,
): Promise<CharacterData> {
	const [row] = await db
		.insert(characters)
		.values({
			playerId,
			name,
			characterClass,
			str: baseStats.str,
			dex: baseStats.dex,
			intStat: baseStats.int,
			vit: baseStats.vit,
			hpCurrent: hpMax,
			mpCurrent: mpMax,
		})
		.returning();

	return {
		id: row.id,
		playerId: row.playerId,
		name: row.name,
		characterClass: row.characterClass,
		zone: row.zone,
		posX: row.posX,
		posY: row.posY,
		posZ: row.posZ,
		level: row.level,
		xp: row.xp,
		statPoints: row.statPoints,
		str: row.str,
		dex: row.dex,
		intStat: row.intStat,
		vit: row.vit,
		hpCurrent: row.hpCurrent,
		mpCurrent: row.mpCurrent,
	};
}

/** Save a single character (used on disconnect). */
export async function saveCharacter(
	characterId: number,
	data: Omit<CharacterSaveData, "characterId">,
): Promise<void> {
	await db
		.update(characters)
		.set({
			zone: data.zone,
			posX: data.posX,
			posY: data.posY,
			posZ: data.posZ,
			level: data.level,
			xp: data.xp,
			statPoints: data.statPoints,
			str: data.str,
			dex: data.dex,
			intStat: data.intStat,
			vit: data.vit,
			hpCurrent: data.hpCurrent,
			mpCurrent: data.mpCurrent,
			updatedAt: new Date(),
		})
		.where(eq(characters.id, characterId));
}

/** Batch save multiple characters in a single transaction (used for auto-save). */
export async function saveCharactersBatch(saves: CharacterSaveData[]): Promise<void> {
	if (saves.length === 0) return;

	await db.transaction(async (tx) => {
		const now = new Date();
		for (const data of saves) {
			await tx
				.update(characters)
				.set({
					zone: data.zone,
					posX: data.posX,
					posY: data.posY,
					posZ: data.posZ,
					level: data.level,
					xp: data.xp,
					statPoints: data.statPoints,
					str: data.str,
					dex: data.dex,
					intStat: data.intStat,
					vit: data.vit,
					hpCurrent: data.hpCurrent,
					mpCurrent: data.mpCurrent,
					updatedAt: now,
				})
				.where(eq(characters.id, data.characterId));
		}
	});
}

// ── Inventory Persistence ───────────────────────────────────

const EQUIP_SLOTS: EquipSlot[] = [
	"weapon",
	"helmet",
	"armor",
	"boots",
	"shield",
	"earring",
	"bracelet",
	"necklace",
];

export async function loadInventory(characterId: number): Promise<(InventorySlot | null)[]> {
	const rows = await db.query.inventoryItems.findMany({
		where: eq(inventoryItems.characterId, characterId),
	});

	const slots: (InventorySlot | null)[] = new Array(45).fill(null);
	for (const row of rows) {
		if (row.slot >= 0 && row.slot < 45) {
			slots[row.slot] = {
				itemId: row.itemId,
				quantity: row.quantity,
				upgradeLevel: row.upgradeLevel,
			};
		}
	}
	return slots;
}

export async function saveInventory(
	characterId: number,
	slots: (InventorySlot | null)[],
): Promise<void> {
	await db.transaction(async (tx) => {
		// Delete existing
		await tx.delete(inventoryItems).where(eq(inventoryItems.characterId, characterId));

		// Insert non-null slots
		const rows = [];
		for (let i = 0; i < slots.length; i++) {
			const slot = slots[i];
			if (slot) {
				rows.push({
					characterId,
					slot: i,
					itemId: slot.itemId,
					quantity: slot.quantity,
					upgradeLevel: slot.upgradeLevel,
				});
			}
		}
		if (rows.length > 0) {
			await tx.insert(inventoryItems).values(rows);
		}
	});
}

export async function loadEquipment(characterId: number): Promise<EquipmentSlots> {
	const rows = await db.query.equippedItems.findMany({
		where: eq(equippedItems.characterId, characterId),
	});

	const equipment: EquipmentSlots = {
		weapon: null,
		helmet: null,
		armor: null,
		boots: null,
		shield: null,
		earring: null,
		bracelet: null,
		necklace: null,
	};

	for (const row of rows) {
		if (EQUIP_SLOTS.includes(row.slot as EquipSlot)) {
			equipment[row.slot as EquipSlot] = {
				itemId: row.itemId,
				quantity: 1,
				upgradeLevel: row.upgradeLevel,
			};
		}
	}
	return equipment;
}

export async function saveEquipment(characterId: number, equipment: EquipmentSlots): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(equippedItems).where(eq(equippedItems.characterId, characterId));

		const rows = [];
		for (const slot of EQUIP_SLOTS) {
			const item = equipment[slot];
			if (item) {
				rows.push({
					characterId,
					slot,
					itemId: item.itemId,
					upgradeLevel: item.upgradeLevel,
				});
			}
		}
		if (rows.length > 0) {
			await tx.insert(equippedItems).values(rows);
		}
	});
}

export async function loadYang(characterId: number): Promise<number> {
	const row = await db.query.characters.findFirst({
		where: eq(characters.id, characterId),
		columns: { yang: true },
	});
	return row?.yang ?? 0;
}

export async function saveYang(characterId: number, yang: number): Promise<void> {
	await db.update(characters).set({ yang }).where(eq(characters.id, characterId));
}
