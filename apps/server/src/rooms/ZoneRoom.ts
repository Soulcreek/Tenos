import { MapSchema, Schema, defineTypes } from "@colyseus/schema";
import { NetworkIdentity, Position, Rotation, TICK_INTERVAL_MS, Velocity } from "@tenos/shared";
import { createWorld } from "@tenos/shared";
import { addComponent, addEntity, defineQuery, removeEntity } from "bitecs";
import { type Client, Room } from "colyseus";

// ── Colyseus State Schema ──────────────────────────────────────
// Synced to all connected clients automatically.

class PlayerState extends Schema {
	x = 0;
	y = 0;
	z = 0;
	rotY = 0;
	name = "";
}

defineTypes(PlayerState, {
	x: "number",
	y: "number",
	z: "number",
	rotY: "number",
	name: "string",
});

class ZoneState extends Schema {
	players = new MapSchema<PlayerState>();
	playerCount = 0;
	zoneName = "";
}

defineTypes(ZoneState, {
	players: { map: PlayerState },
	playerCount: "number",
	zoneName: "string",
});

// ── ECS Queries ────────────────────────────────────────────────

const allPlayersQuery = defineQuery([Position, Velocity, NetworkIdentity]);

// ── Session → Entity mapping ───────────────────────────────────

interface PlayerEntry {
	eid: number;
	sessionId: string;
}

/**
 * Authoritative zone room. Each zone in the game world is one ZoneRoom instance.
 * Manages player entities via BitECS, syncs state via Colyseus schema at 20Hz.
 */
export class ZoneRoom extends Room<ZoneState> {
	private world = createWorld();
	private players = new Map<string, PlayerEntry>();
	private tickInterval: ReturnType<typeof setInterval> | null = null;
	private nextNetId = 1;

	onCreate(options: { zoneName?: string }) {
		const zoneName = options.zoneName ?? "village-shinsoo";
		this.setState(new ZoneState());
		this.state.zoneName = zoneName;

		// Handle player input messages
		this.onMessage("input", (client, data: { moveX: number; moveZ: number; jump: boolean }) => {
			this.handleInput(client.sessionId, data);
		});

		// Start authoritative tick at 20Hz
		this.tickInterval = setInterval(() => {
			this.tick();
		}, TICK_INTERVAL_MS);

		console.log(`[ZoneRoom] Created: ${zoneName}`);
	}

	onJoin(client: Client, options: { name?: string }) {
		const eid = addEntity(this.world);
		addComponent(this.world, Position, eid);
		addComponent(this.world, Velocity, eid);
		addComponent(this.world, Rotation, eid);
		addComponent(this.world, NetworkIdentity, eid);

		// Assign network ID
		const netId = this.nextNetId++;
		NetworkIdentity.netId[eid] = netId;
		NetworkIdentity.ownerId[eid] = hashSessionId(client.sessionId);

		// Spawn at zone origin
		Position.x[eid] = 0;
		Position.y[eid] = 0;
		Position.z[eid] = 0;

		// Track player
		this.players.set(client.sessionId, { eid, sessionId: client.sessionId });

		// Add to Colyseus state
		const playerState = new PlayerState();
		playerState.name = options.name ?? `Player-${netId}`;
		this.state.players.set(client.sessionId, playerState);
		this.state.playerCount = this.players.size;

		console.log(`[ZoneRoom] Player joined: ${client.sessionId} (eid=${eid}, netId=${netId})`);
	}

	onLeave(client: Client) {
		const entry = this.players.get(client.sessionId);
		if (entry) {
			removeEntity(this.world, entry.eid);
			this.players.delete(client.sessionId);
			this.state.players.delete(client.sessionId);
			this.state.playerCount = this.players.size;
		}
		console.log(`[ZoneRoom] Player left: ${client.sessionId}`);
	}

	onDispose() {
		if (this.tickInterval) clearInterval(this.tickInterval);
		console.log(`[ZoneRoom] Disposed: ${this.state.zoneName}`);
	}

	// ── Input Processing ───────────────────────────────────────

	private handleInput(sessionId: string, data: { moveX: number; moveZ: number; jump: boolean }) {
		const entry = this.players.get(sessionId);
		if (!entry) return;

		const eid = entry.eid;
		const speed = 5.0;

		// Clamp input to [-1, 1]
		const mx = Math.max(-1, Math.min(1, data.moveX));
		const mz = Math.max(-1, Math.min(1, data.moveZ));

		Velocity.x[eid] = mx * speed;
		Velocity.z[eid] = mz * speed;

		// Face movement direction
		if (mx !== 0 || mz !== 0) {
			Rotation.y[eid] = Math.atan2(mx, mz);
		}
	}

	// ── Server Tick (20Hz) ─────────────────────────────────────

	private tick() {
		const dt = TICK_INTERVAL_MS / 1000;
		const entities = allPlayersQuery(this.world);

		for (let i = 0; i < entities.length; i++) {
			const eid = entities[i];

			// Apply velocity
			Position.x[eid] += Velocity.x[eid] * dt;
			Position.y[eid] += Velocity.y[eid] * dt;
			Position.z[eid] += Velocity.z[eid] * dt;

			// Simple boundary clamp (keep on terrain)
			const half = 64;
			Position.x[eid] = Math.max(-half, Math.min(half, Position.x[eid]));
			Position.z[eid] = Math.max(-half, Math.min(half, Position.z[eid]));

			// Floor at y=0
			if (Position.y[eid] < 0) {
				Position.y[eid] = 0;
				Velocity.y[eid] = 0;
			}
		}

		// Sync ECS → Colyseus state
		for (const [sessionId, entry] of this.players) {
			const playerState = this.state.players.get(sessionId);
			if (!playerState) continue;
			playerState.x = Position.x[entry.eid];
			playerState.y = Position.y[entry.eid];
			playerState.z = Position.z[entry.eid];
			playerState.rotY = Rotation.y[entry.eid];
		}
	}
}

/** Simple hash of session ID string to a uint32 for ECS storage. */
function hashSessionId(id: string): number {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
	}
	return hash >>> 0;
}
