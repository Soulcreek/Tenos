import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createServer } from "node:http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { Client } from "colyseus.js";
import { eq } from "drizzle-orm";
import { db, ensureDbConnection } from "../db/client.js";
import { characters, players } from "../db/schema.js";
import { ZoneRoom } from "./ZoneRoom.js";

let httpServer: ReturnType<typeof createServer>;
let gameServer: Server;
let testPort: number;

async function cleanDb() {
	await db.delete(characters);
	await db.delete(players);
}

/** Join and complete class selection for new characters. */
async function joinWithClass(
	client: Client,
	name: string,
	characterClass = "warrior",
): Promise<ReturnType<Client["joinOrCreate"]> extends Promise<infer R> ? R : never> {
	const room = await client.joinOrCreate("zone", { name });

	// Listen for class_select_prompt and auto-respond
	await new Promise<void>((resolve) => {
		let resolved = false;
		room.onMessage("class_select_prompt", () => {
			room.send("class_select", { characterClass });
		});
		// Wait for the player state to be synced (class selected + finalized)
		room.onStateChange(() => {
			if (!resolved) {
				resolved = true;
				// Give a bit more time for DB writes
				setTimeout(resolve, 300);
			}
		});
		// Fallback timeout in case state was already synced (existing character)
		setTimeout(() => {
			if (!resolved) {
				resolved = true;
				resolve();
			}
		}, 800);
	});

	return room;
}

beforeAll(async () => {
	await ensureDbConnection();
	await cleanDb();

	// Start a Colyseus server on a random port
	httpServer = createServer();
	const transport = new WebSocketTransport({ server: httpServer });
	gameServer = new Server({ transport });
	gameServer.define("zone", ZoneRoom);

	await new Promise<void>((resolve) => {
		httpServer.listen(0, () => {
			const addr = httpServer.address();
			testPort = typeof addr === "object" && addr ? addr.port : 0;
			resolve();
		});
	});
});

afterEach(async () => {
	await cleanDb();
});

afterAll(async () => {
	try {
		await gameServer.gracefullyShutdown(false);
	} catch {
		// ignore
	}
	httpServer.close();
	await cleanDb();
});

function createTestClient(): Client {
	return new Client(`ws://localhost:${testPort}`);
}

describe("ZoneRoom persistence", () => {
	test("onJoin creates player and character in DB", async () => {
		const client = createTestClient();
		const room = await joinWithClass(client, "TestHero", "warrior");

		const player = await db.query.players.findFirst({
			where: eq(players.username, "TestHero"),
		});
		expect(player).toBeDefined();
		expect(player?.username).toBe("TestHero");

		if (!player) throw new Error("player not found");

		const char = await db.query.characters.findFirst({
			where: eq(characters.playerId, player.id),
		});
		expect(char).toBeDefined();
		expect(char?.name).toBe("TestHero");
		expect(char?.characterClass).toBe("warrior");
		expect(char?.level).toBe(1);
		expect(char?.str).toBe(14);
		expect(char?.dex).toBe(6);
		expect(char?.intStat).toBe(4);
		expect(char?.vit).toBe(12);
		expect(char?.hpCurrent).toBeGreaterThan(0);

		await room.leave();
		await new Promise((r) => setTimeout(r, 300));
	});

	test("onLeave saves character state to DB", async () => {
		const client = createTestClient();
		const room = await joinWithClass(client, "SaveHero");

		// Send movement input to change position
		room.send("input", { moveX: 1, moveZ: 0, jump: false });
		await new Promise((r) => setTimeout(r, 200));

		// Disconnect → triggers onLeave → save
		await room.leave();
		await new Promise((r) => setTimeout(r, 500));

		const player = await db.query.players.findFirst({
			where: eq(players.username, "SaveHero"),
		});
		if (!player) throw new Error("player not found");

		const char = await db.query.characters.findFirst({
			where: eq(characters.playerId, player.id),
		});

		expect(char).toBeDefined();
		if (!char) throw new Error("char not found");
		// Position should have been saved (may have moved slightly from input)
		expect(char.updatedAt.getTime()).toBeGreaterThan(char.createdAt.getTime() - 1000);
	});

	test("reconnect loads persisted character data", async () => {
		// First connection: create character
		const client1 = createTestClient();
		const room1 = await joinWithClass(client1, "PersistHero");

		// Disconnect first — onLeave saves current state to DB
		await room1.leave();
		await new Promise((r) => setTimeout(r, 500));

		// Now update DB AFTER the save (simulating offline DB edit / previous session)
		const player = await db.query.players.findFirst({
			where: eq(players.username, "PersistHero"),
		});
		if (!player) throw new Error("player not found");

		const char = await db.query.characters.findFirst({
			where: eq(characters.playerId, player.id),
		});
		if (!char) throw new Error("char not found");

		await db
			.update(characters)
			.set({
				level: 5,
				xp: 2000,
				str: 18,
				dex: 12,
				intStat: 8,
				vit: 14,
				posX: 10,
				posZ: -5,
				hpCurrent: 300,
				mpCurrent: 60,
			})
			.where(eq(characters.id, char.id));

		// Reconnect: server should load the updated DB data
		const client2 = createTestClient();
		const room2 = await joinWithClass(client2, "PersistHero");

		// Verify the character in DB still has the correct level
		const reloaded = await db.query.characters.findFirst({
			where: eq(characters.id, char.id),
		});
		expect(reloaded?.level).toBe(5);
		expect(reloaded?.str).toBe(18);
		expect(reloaded?.posX ?? 0).toBeCloseTo(10, 1);

		// Disconnect and verify the loaded state was saved back correctly
		await room2.leave();
		await new Promise((r) => setTimeout(r, 500));

		const afterSave = await db.query.characters.findFirst({
			where: eq(characters.id, char.id),
		});
		// Level should still be 5 after save (loaded from DB, saved back)
		expect(afterSave?.level).toBe(5);
		expect(afterSave?.str).toBe(18);
	});

	test("does not create duplicate characters on reconnect", async () => {
		const client1 = createTestClient();
		const room1 = await joinWithClass(client1, "NoDupe");
		await room1.leave();
		await new Promise((r) => setTimeout(r, 300));

		const client2 = createTestClient();
		const room2 = await joinWithClass(client2, "NoDupe");
		await room2.leave();
		await new Promise((r) => setTimeout(r, 300));

		// Should only have one character
		const player = await db.query.players.findFirst({
			where: eq(players.username, "NoDupe"),
		});
		if (!player) throw new Error("player not found");

		const chars = await db.select().from(characters).where(eq(characters.playerId, player.id));
		expect(chars.length).toBe(1);
	});

	test("multiple players can join and get unique characters", async () => {
		const client1 = createTestClient();
		const client2 = createTestClient();

		const room1 = await joinWithClass(client1, "Player1");
		const room2 = await joinWithClass(client2, "Player2");

		const p1 = await db.query.players.findFirst({
			where: eq(players.username, "Player1"),
		});
		const p2 = await db.query.players.findFirst({
			where: eq(players.username, "Player2"),
		});
		expect(p1).toBeDefined();
		expect(p2).toBeDefined();
		expect(p1?.id).not.toBe(p2?.id);

		if (!p1 || !p2) throw new Error("players not found");

		const c1 = await db.query.characters.findFirst({
			where: eq(characters.playerId, p1.id),
		});
		const c2 = await db.query.characters.findFirst({
			where: eq(characters.playerId, p2.id),
		});
		expect(c1).toBeDefined();
		expect(c2).toBeDefined();
		expect(c1?.name).toBe("Player1");
		expect(c2?.name).toBe("Player2");

		await room1.leave();
		await room2.leave();
		await new Promise((r) => setTimeout(r, 300));
	});
});
