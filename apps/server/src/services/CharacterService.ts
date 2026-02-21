import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { characters, players } from "../db/schema.js";

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
		await db
			.update(players)
			.set({ lastLoginAt: new Date() })
			.where(eq(players.id, existing.id));
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
export async function saveCharacter(characterId: number, data: Omit<CharacterSaveData, "characterId">): Promise<void> {
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
