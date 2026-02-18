import { Client, type Room } from "colyseus.js";

export interface RemotePlayerData {
	sessionId: string;
	x: number;
	y: number;
	z: number;
	rotY: number;
	name: string;
}

export type NetworkEventMap = {
	playerJoin: (sessionId: string, data: RemotePlayerData) => void;
	playerLeave: (sessionId: string) => void;
	stateUpdate: (players: Map<string, RemotePlayerData>) => void;
};

/**
 * Manages the Colyseus WebSocket connection.
 * Sends player input to the server and receives authoritative state.
 */
export class NetworkManager {
	private client: Client;
	private room: Room | null = null;
	private listeners: Partial<{ [K in keyof NetworkEventMap]: NetworkEventMap[K][] }> = {};
	private remotePlayers = new Map<string, RemotePlayerData>();

	/** Our session ID once connected. */
	sessionId = "";
	/** Number of players in the zone (including us). */
	playerCount = 0;
	/** Whether we're connected to the server. */
	connected = false;

	constructor(serverUrl = `ws://${window.location.hostname}:2567`) {
		this.client = new Client(serverUrl);
	}

	async joinZone(zoneName = "village-shinsoo", playerName = "Player"): Promise<void> {
		try {
			this.room = await this.client.joinOrCreate("zone", {
				zoneName,
				name: playerName,
			});
			this.sessionId = this.room.sessionId;
			this.connected = true;
			console.info(`[Network] Connected: ${this.sessionId}`);

			this.setupStateListeners();
		} catch (err) {
			console.warn("[Network] Failed to connect:", err);
			this.connected = false;
		}
	}

	/** Send player input to the server (called each frame or at tick rate). */
	sendInput(moveX: number, moveZ: number, jump: boolean): void {
		if (!this.room) return;
		this.room.send("input", { moveX, moveZ, jump });
	}

	on<K extends keyof NetworkEventMap>(event: K, callback: NetworkEventMap[K]): void {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(callback);
	}

	getRemotePlayers(): Map<string, RemotePlayerData> {
		return this.remotePlayers;
	}

	async leave(): Promise<void> {
		if (this.room) {
			await this.room.leave();
			this.room = null;
			this.connected = false;
			this.remotePlayers.clear();
		}
	}

	private setupStateListeners(): void {
		if (!this.room) return;

		// Colyseus state change listener
		this.room.state.players?.onAdd((player: Record<string, unknown>, sessionId: string) => {
			if (sessionId === this.sessionId) return; // skip self

			const data: RemotePlayerData = {
				sessionId,
				x: (player.x as number) ?? 0,
				y: (player.y as number) ?? 0,
				z: (player.z as number) ?? 0,
				rotY: (player.rotY as number) ?? 0,
				name: (player.name as string) ?? "",
			};
			this.remotePlayers.set(sessionId, data);
			this.emit("playerJoin", sessionId, data);

			// Listen for changes on this player
			(player as { listen?: (prop: string, cb: (val: number) => void) => void }).listen?.(
				"x",
				(val: number) => {
					const p = this.remotePlayers.get(sessionId);
					if (p) p.x = val;
				},
			);
			(player as { listen?: (prop: string, cb: (val: number) => void) => void }).listen?.(
				"y",
				(val: number) => {
					const p = this.remotePlayers.get(sessionId);
					if (p) p.y = val;
				},
			);
			(player as { listen?: (prop: string, cb: (val: number) => void) => void }).listen?.(
				"z",
				(val: number) => {
					const p = this.remotePlayers.get(sessionId);
					if (p) p.z = val;
				},
			);
			(player as { listen?: (prop: string, cb: (val: number) => void) => void }).listen?.(
				"rotY",
				(val: number) => {
					const p = this.remotePlayers.get(sessionId);
					if (p) p.rotY = val;
				},
			);
		});

		this.room.state.players?.onRemove((_player: unknown, sessionId: string) => {
			this.remotePlayers.delete(sessionId);
			this.emit("playerLeave", sessionId);
		});

		// Track player count
		this.room.state.listen?.("playerCount", (count: number) => {
			this.playerCount = count;
		});
	}

	private emit<K extends keyof NetworkEventMap>(
		event: K,
		...args: Parameters<NetworkEventMap[K]>
	): void {
		const cbs = this.listeners[event];
		if (!cbs) return;
		for (const cb of cbs) {
			(cb as (...a: unknown[]) => void)(...args);
		}
	}
}
