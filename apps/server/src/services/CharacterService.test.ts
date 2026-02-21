import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db, ensureDbConnection } from "../db/client.js";
import { characters, players } from "../db/schema.js";
import {
	createCharacter,
	findOrCreatePlayer,
	loadCharacter,
	saveCharacter,
	saveCharactersBatch,
} from "./CharacterService.js";

// Clean up test data between tests
async function cleanDb() {
	await db.delete(characters);
	await db.delete(players);
}

beforeAll(async () => {
	await ensureDbConnection();
});

afterEach(async () => {
	await cleanDb();
});

afterAll(async () => {
	await cleanDb();
});

describe("findOrCreatePlayer", () => {
	test("creates a new player if none exists", async () => {
		const id = await findOrCreatePlayer("testuser1");
		expect(id).toBeGreaterThan(0);

		const row = await db.query.players.findFirst({
			where: eq(players.username, "testuser1"),
		});
		expect(row).toBeDefined();
		expect(row?.username).toBe("testuser1");
		expect(row?.displayName).toBe("testuser1");
		expect(row?.lastLoginAt).toBeInstanceOf(Date);
	});

	test("returns existing player ID on second call", async () => {
		const id1 = await findOrCreatePlayer("testuser2");
		const id2 = await findOrCreatePlayer("testuser2");
		expect(id1).toBe(id2);
	});

	test("updates lastLoginAt on returning player", async () => {
		const id = await findOrCreatePlayer("testuser3");
		const row1 = await db.query.players.findFirst({
			where: eq(players.id, id),
		});
		const firstLogin = row1?.lastLoginAt?.getTime() ?? 0;

		// Small delay to ensure timestamp differs
		await new Promise((r) => setTimeout(r, 50));
		await findOrCreatePlayer("testuser3");

		const row2 = await db.query.players.findFirst({
			where: eq(players.id, id),
		});
		expect(row2?.lastLoginAt?.getTime() ?? 0).toBeGreaterThanOrEqual(firstLogin);
	});
});

describe("createCharacter", () => {
	test("creates a character with warrior defaults", async () => {
		const playerId = await findOrCreatePlayer("warrior1");
		const char = await createCharacter(
			playerId,
			"WarriorChar",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			250,
			100,
		);

		expect(char.id).toBeGreaterThan(0);
		expect(char.playerId).toBe(playerId);
		expect(char.name).toBe("WarriorChar");
		expect(char.characterClass).toBe("warrior");
		expect(char.level).toBe(1);
		expect(char.xp).toBe(0);
		expect(char.str).toBe(14);
		expect(char.dex).toBe(6);
		expect(char.intStat).toBe(4);
		expect(char.vit).toBe(12);
		expect(char.hpCurrent).toBe(250);
		expect(char.mpCurrent).toBe(100);
		expect(char.zone).toBe("village-shinsoo");
		expect(char.posX).toBe(0);
		expect(char.posY).toBe(0);
		expect(char.posZ).toBe(0);
	});

	test("enforces unique character names", async () => {
		const p1 = await findOrCreatePlayer("player_a");
		const p2 = await findOrCreatePlayer("player_b");

		await createCharacter(
			p1,
			"UniqueName",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			100,
			50,
		);

		expect(
			createCharacter(p2, "UniqueName", "warrior", { str: 14, dex: 6, int: 4, vit: 12 }, 100, 50),
		).rejects.toThrow();
	});
});

describe("loadCharacter", () => {
	test("returns null for player with no character", async () => {
		const playerId = await findOrCreatePlayer("nochar");
		const result = await loadCharacter(playerId);
		expect(result).toBeNull();
	});

	test("loads an existing character", async () => {
		const playerId = await findOrCreatePlayer("haschar");
		await createCharacter(
			playerId,
			"MyChar",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			200,
			80,
		);

		const loaded = await loadCharacter(playerId);
		expect(loaded).not.toBeNull();
		expect(loaded?.name).toBe("MyChar");
		expect(loaded?.str).toBe(14);
		expect(loaded?.hpCurrent).toBe(200);
	});
});

describe("saveCharacter", () => {
	test("updates character state", async () => {
		const playerId = await findOrCreatePlayer("saver");
		const char = await createCharacter(
			playerId,
			"SaveTest",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			250,
			100,
		);

		await saveCharacter(char.id, {
			zone: "dungeon-1",
			posX: 10.5,
			posY: 0,
			posZ: -5.25,
			level: 5,
			xp: 1234,
			statPoints: 9,
			str: 15,
			dex: 10,
			intStat: 7,
			vit: 13,
			hpCurrent: 180,
			mpCurrent: 60,
		});

		const loaded = await loadCharacter(playerId);
		expect(loaded).not.toBeNull();
		expect(loaded?.zone).toBe("dungeon-1");
		expect(loaded?.posX).toBeCloseTo(10.5, 1);
		expect(loaded?.posZ).toBeCloseTo(-5.25, 1);
		expect(loaded?.level).toBe(5);
		expect(loaded?.xp).toBe(1234);
		expect(loaded?.statPoints).toBe(9);
		expect(loaded?.str).toBe(15);
		expect(loaded?.dex).toBe(10);
		expect(loaded?.intStat).toBe(7);
		expect(loaded?.vit).toBe(13);
		expect(loaded?.hpCurrent).toBeCloseTo(180, 1);
		expect(loaded?.mpCurrent).toBeCloseTo(60, 1);
	});
});

describe("saveCharactersBatch", () => {
	test("saves multiple characters in a transaction", async () => {
		const p1 = await findOrCreatePlayer("batch1");
		const p2 = await findOrCreatePlayer("batch2");
		const c1 = await createCharacter(
			p1,
			"Batch1Char",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			200,
			80,
		);
		const c2 = await createCharacter(
			p2,
			"Batch2Char",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			200,
			80,
		);

		await saveCharactersBatch([
			{
				characterId: c1.id,
				zone: "village-shinsoo",
				posX: 1,
				posY: 0,
				posZ: 2,
				level: 3,
				xp: 500,
				statPoints: 6,
				str: 14,
				dex: 9,
				intStat: 6,
				vit: 11,
				hpCurrent: 150,
				mpCurrent: 70,
			},
			{
				characterId: c2.id,
				zone: "village-shinsoo",
				posX: 5,
				posY: 0,
				posZ: -3,
				level: 2,
				xp: 200,
				statPoints: 3,
				str: 13,
				dex: 8,
				intStat: 5,
				vit: 10,
				hpCurrent: 180,
				mpCurrent: 90,
			},
		]);

		const l1 = await loadCharacter(p1);
		const l2 = await loadCharacter(p2);

		expect(l1?.level).toBe(3);
		expect(l1?.posX).toBeCloseTo(1, 1);
		expect(l1?.str).toBe(14);

		expect(l2?.level).toBe(2);
		expect(l2?.posX).toBeCloseTo(5, 1);
		expect(l2?.str).toBe(13);
	});

	test("handles empty batch gracefully", async () => {
		// Should not throw
		await saveCharactersBatch([]);
	});
});

describe("full persistence round-trip", () => {
	test("create → save → load preserves all fields", async () => {
		const playerId = await findOrCreatePlayer("roundtrip");
		const char = await createCharacter(
			playerId,
			"RoundTrip",
			"warrior",
			{ str: 14, dex: 6, int: 4, vit: 12 },
			250,
			100,
		);

		// Simulate gameplay: player leveled up, moved, took damage
		await saveCharacter(char.id, {
			zone: "village-shinsoo",
			posX: 15.75,
			posY: 0,
			posZ: -8.5,
			level: 7,
			xp: 3456,
			statPoints: 12,
			str: 20,
			dex: 12,
			intStat: 8,
			vit: 16,
			hpCurrent: 320,
			mpCurrent: 45,
		});

		// Simulate reconnect: load from DB
		const loaded = await loadCharacter(playerId);
		expect(loaded).not.toBeNull();
		expect(loaded?.id).toBe(char.id);
		expect(loaded?.name).toBe("RoundTrip");
		expect(loaded?.characterClass).toBe("warrior");
		expect(loaded?.zone).toBe("village-shinsoo");
		expect(loaded?.posX).toBeCloseTo(15.75, 1);
		expect(loaded?.posZ).toBeCloseTo(-8.5, 1);
		expect(loaded?.level).toBe(7);
		expect(loaded?.xp).toBe(3456);
		expect(loaded?.statPoints).toBe(12);
		expect(loaded?.str).toBe(20);
		expect(loaded?.dex).toBe(12);
		expect(loaded?.intStat).toBe(8);
		expect(loaded?.vit).toBe(16);
		expect(loaded?.hpCurrent).toBeCloseTo(320, 1);
		expect(loaded?.mpCurrent).toBeCloseTo(45, 1);
	});
});
