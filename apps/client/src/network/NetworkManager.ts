import type {
	BuffApplyMsg,
	DamageMsg,
	EntityDiedMsg,
	HealEffectMsg,
	InventorySyncMsg,
	LevelUpMsg,
	LootPickupMsg,
	LootSpawnMsg,
	PlayerRespawnMsg,
	ProjectileSpawnMsg,
	SkillEffectMsg,
	UpgradeResultMsg,
	XPGainMsg,
} from "@tenos/shared";
import { Client, type Room } from "colyseus.js";

export interface RemotePlayerData {
	sessionId: string;
	netId: number;
	x: number;
	y: number;
	z: number;
	rotY: number;
	name: string;
	hp: number;
	hpMax: number;
	mp: number;
	mpMax: number;
	level: number;
	targetNetId: number;
	isDead: boolean;
	characterClass: string;
}

export interface RemoteMonsterData {
	netId: number;
	typeId: number;
	x: number;
	y: number;
	z: number;
	rotY: number;
	hp: number;
	hpMax: number;
	level: number;
	isDead: boolean;
}

export interface RemoteLootData {
	netId: number;
	itemId: number;
	name: string;
	qty: number;
	x: number;
	z: number;
}

export type NetworkEventMap = {
	playerJoin: (sessionId: string, data: RemotePlayerData) => void;
	playerLeave: (sessionId: string) => void;
	stateUpdate: (players: Map<string, RemotePlayerData>) => void;
	monsterAdd: (data: RemoteMonsterData) => void;
	monsterRemove: (netId: number) => void;
	monsterUpdate: (data: RemoteMonsterData) => void;
	lootAdd: (data: RemoteLootData) => void;
	lootRemove: (key: string) => void;
	damage: (msg: DamageMsg) => void;
	entityDied: (msg: EntityDiedMsg) => void;
	xpGain: (msg: XPGainMsg) => void;
	levelUp: (msg: LevelUpMsg) => void;
	lootSpawn: (msg: LootSpawnMsg) => void;
	lootPickup: (msg: LootPickupMsg) => void;
	playerRespawn: (msg: PlayerRespawnMsg) => void;
	playerDeath: (msg: { xpLost: number; respawnTime: number }) => void;
	statUpdate: (msg: {
		str: number;
		dex: number;
		int: number;
		vit: number;
		statPoints: number;
		hpMax: number;
		mpMax: number;
		attackPower: number;
		defense: number;
		attackSpeed: number;
		critChance: number;
		moveSpeed: number;
	}) => void;
	// M3: Class & Skills
	classSelectPrompt: () => void;
	skillEffect: (msg: SkillEffectMsg) => void;
	projectileSpawn: (msg: ProjectileSpawnMsg) => void;
	buffApply: (msg: BuffApplyMsg) => void;
	healEffect: (msg: HealEffectMsg) => void;
	// M3: Inventory
	inventorySync: (msg: InventorySyncMsg) => void;
	upgradeResult: (msg: UpgradeResultMsg) => void;
};

/**
 * Manages the Colyseus WebSocket connection.
 * Extended with combat message support for M2.
 */
export class NetworkManager {
	private client: Client;
	private room: Room | null = null;
	private listeners: Partial<{ [K in keyof NetworkEventMap]: NetworkEventMap[K][] }> = {};
	private remotePlayers = new Map<string, RemotePlayerData>();
	private remoteMonsters = new Map<number, RemoteMonsterData>();

	/** Our session ID once connected. */
	sessionId = "";
	/** Number of players in the zone (including us). */
	playerCount = 0;
	/** Whether we're connected to the server. */
	connected = false;

	/** Our player's HP (from schema). */
	selfHp = 100;
	selfHpMax = 100;
	selfMp = 50;
	selfMpMax = 50;
	selfLevel = 1;

	constructor(serverUrl?: string) {
		let url = serverUrl;
		if (!url) {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			url = `${protocol}//${window.location.host}`;
		}
		this.client = new Client(url);
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
			this.setupMessageListeners();
		} catch (err) {
			console.warn("[Network] Failed to connect:", err);
			this.connected = false;
		}
	}

	// ── Send Methods ───────────────────────────────────────────

	sendInput(moveX: number, moveZ: number, jump: boolean): void {
		if (!this.room) return;
		this.room.send("input", { moveX, moveZ, jump });
	}

	sendSelectTarget(netId: number): void {
		if (!this.room) return;
		this.room.send("select_target", { netId });
	}

	sendRequestAttack(netId: number): void {
		if (!this.room) return;
		this.room.send("request_attack", { netId });
	}

	sendPickupLoot(netId: number): void {
		if (!this.room) return;
		this.room.send("pickup_loot", { netId });
	}

	sendAllocateStat(stat: "str" | "dex" | "int" | "vit"): void {
		if (!this.room) return;
		this.room.send("allocate_stat", { stat });
	}

	sendUseSkill(slot: number): void {
		if (!this.room) return;
		this.room.send("use_skill", { slot });
	}

	sendClassSelect(characterClass: string): void {
		if (!this.room) return;
		this.room.send("class_select", { characterClass });
	}

	sendEquipItem(inventorySlot: number): void {
		if (!this.room) return;
		this.room.send("equip_item", { inventorySlot });
	}

	sendUnequipItem(equipSlot: string): void {
		if (!this.room) return;
		this.room.send("unequip_item", { equipSlot });
	}

	sendDropItem(inventorySlot: number, quantity: number): void {
		if (!this.room) return;
		this.room.send("drop_item", { inventorySlot, quantity });
	}

	sendUseItem(inventorySlot: number): void {
		if (!this.room) return;
		this.room.send("use_item", { inventorySlot });
	}

	sendUpgradeItem(inventorySlot: number, useWardingSeal: boolean): void {
		if (!this.room) return;
		this.room.send("upgrade_item", { inventorySlot, useWardingSeal });
	}

	// ── Event System ───────────────────────────────────────────

	on<K extends keyof NetworkEventMap>(event: K, callback: NetworkEventMap[K]): void {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(callback);
	}

	getRemotePlayers(): Map<string, RemotePlayerData> {
		return this.remotePlayers;
	}

	getRemoteMonsters(): Map<number, RemoteMonsterData> {
		return this.remoteMonsters;
	}

	async leave(): Promise<void> {
		if (this.room) {
			await this.room.leave();
			this.room = null;
			this.connected = false;
			this.remotePlayers.clear();
			this.remoteMonsters.clear();
		}
	}

	// ── State Listeners (Schema delta-sync) ────────────────────

	private setupStateListeners(): void {
		if (!this.room) return;

		// Players
		this.room.state.players?.onAdd((player: Record<string, unknown>, sessionId: string) => {
			if (sessionId === this.sessionId) {
				// Track self state
				this.trackSelfPlayer(player);
				return;
			}

			const data = this.extractPlayerData(sessionId, player);
			this.remotePlayers.set(sessionId, data);
			this.emit("playerJoin", sessionId, data);
			this.listenPlayerChanges(player, sessionId);
		});

		this.room.state.players?.onRemove((_player: unknown, sessionId: string) => {
			this.remotePlayers.delete(sessionId);
			this.emit("playerLeave", sessionId);
		});

		// Monsters
		this.room.state.monsters?.onAdd((monster: Record<string, unknown>, _key: string) => {
			const data = this.extractMonsterData(monster);
			this.remoteMonsters.set(data.netId, data);
			this.emit("monsterAdd", data);
			this.listenMonsterChanges(monster, data.netId);
		});

		this.room.state.monsters?.onRemove((monster: Record<string, unknown>, _key: string) => {
			const netId = (monster.netId as number) ?? 0;
			this.remoteMonsters.delete(netId);
			this.emit("monsterRemove", netId);
		});

		// Loot
		this.room.state.loot?.onAdd((loot: Record<string, unknown>, _key: string) => {
			const data: RemoteLootData = {
				netId: (loot.netId as number) ?? 0,
				itemId: (loot.itemId as number) ?? 0,
				name: (loot.name as string) ?? "",
				qty: (loot.qty as number) ?? 0,
				x: (loot.x as number) ?? 0,
				z: (loot.z as number) ?? 0,
			};
			this.emit("lootAdd", data);
		});

		this.room.state.loot?.onRemove((_loot: unknown, lootKey: string) => {
			this.emit("lootRemove", lootKey);
		});

		// Player count
		this.room.state.listen?.("playerCount", (count: number) => {
			this.playerCount = count;
		});
	}

	private trackSelfPlayer(player: Record<string, unknown>): void {
		this.selfCharacterClass = (player.characterClass as string) ?? "warrior";
		const listen = (player as { listen?: (prop: string, cb: (val: unknown) => void) => void })
			.listen;
		if (!listen) return;

		listen.call(player, "hp", (val: unknown) => {
			this.selfHp = val as number;
		});
		listen.call(player, "hpMax", (val: unknown) => {
			this.selfHpMax = val as number;
		});
		listen.call(player, "mp", (val: unknown) => {
			this.selfMp = val as number;
		});
		listen.call(player, "mpMax", (val: unknown) => {
			this.selfMpMax = val as number;
		});
		listen.call(player, "level", (val: unknown) => {
			this.selfLevel = val as number;
		});
		listen.call(player, "characterClass", (val: unknown) => {
			this.selfCharacterClass = val as string;
		});
	}

	/** Our character class. */
	selfCharacterClass = "warrior";

	private extractPlayerData(sessionId: string, player: Record<string, unknown>): RemotePlayerData {
		return {
			sessionId,
			netId: (player.netId as number) ?? 0,
			x: (player.x as number) ?? 0,
			y: (player.y as number) ?? 0,
			z: (player.z as number) ?? 0,
			rotY: (player.rotY as number) ?? 0,
			name: (player.name as string) ?? "",
			hp: (player.hp as number) ?? 100,
			hpMax: (player.hpMax as number) ?? 100,
			mp: (player.mp as number) ?? 50,
			mpMax: (player.mpMax as number) ?? 50,
			level: (player.level as number) ?? 1,
			targetNetId: (player.targetNetId as number) ?? 0,
			isDead: (player.isDead as boolean) ?? false,
			characterClass: (player.characterClass as string) ?? "warrior",
		};
	}

	private listenPlayerChanges(player: Record<string, unknown>, sessionId: string): void {
		const listen = (player as { listen?: (prop: string, cb: (val: unknown) => void) => void })
			.listen;
		if (!listen) return;

		const props = [
			"netId",
			"x",
			"y",
			"z",
			"rotY",
			"hp",
			"hpMax",
			"mp",
			"mpMax",
			"level",
			"targetNetId",
			"isDead",
			"characterClass",
		] as const;
		for (const prop of props) {
			listen.call(player, prop, (val: unknown) => {
				const p = this.remotePlayers.get(sessionId);
				if (p) (p as unknown as Record<string, unknown>)[prop] = val;
			});
		}
	}

	private extractMonsterData(monster: Record<string, unknown>): RemoteMonsterData {
		return {
			netId: (monster.netId as number) ?? 0,
			typeId: (monster.typeId as number) ?? 0,
			x: (monster.x as number) ?? 0,
			y: (monster.y as number) ?? 0,
			z: (monster.z as number) ?? 0,
			rotY: (monster.rotY as number) ?? 0,
			hp: (monster.hp as number) ?? 0,
			hpMax: (monster.hpMax as number) ?? 0,
			level: (monster.level as number) ?? 1,
			isDead: (monster.isDead as boolean) ?? false,
		};
	}

	private listenMonsterChanges(monster: Record<string, unknown>, netId: number): void {
		const listen = (monster as { listen?: (prop: string, cb: (val: unknown) => void) => void })
			.listen;
		if (!listen) return;

		const props = ["x", "y", "z", "rotY", "hp", "isDead"] as const;
		for (const prop of props) {
			listen.call(monster, prop, (val: unknown) => {
				const m = this.remoteMonsters.get(netId);
				if (m) (m as unknown as Record<string, unknown>)[prop] = val;
				this.emit("monsterUpdate", m ?? this.extractMonsterData(monster));
			});
		}
	}

	// ── Message Listeners (one-shot events) ────────────────────

	private setupMessageListeners(): void {
		if (!this.room) return;

		this.room.onMessage("damage", (msg: DamageMsg) => {
			this.emit("damage", msg);
		});

		this.room.onMessage("entity_died", (msg: EntityDiedMsg) => {
			this.emit("entityDied", msg);
		});

		this.room.onMessage("xp_gain", (msg: XPGainMsg) => {
			this.emit("xpGain", msg);
		});

		this.room.onMessage("level_up", (msg: LevelUpMsg) => {
			this.emit("levelUp", msg);
		});

		this.room.onMessage("loot_spawn", (msg: LootSpawnMsg) => {
			this.emit("lootSpawn", msg);
		});

		this.room.onMessage("loot_pickup", (msg: LootPickupMsg) => {
			this.emit("lootPickup", msg);
		});

		this.room.onMessage("player_respawn", (msg: PlayerRespawnMsg) => {
			this.emit("playerRespawn", msg);
		});

		this.room.onMessage("player_death", (msg: { xpLost: number; respawnTime: number }) => {
			this.emit("playerDeath", msg);
		});

		this.room.onMessage("stat_update", (msg: Parameters<NetworkEventMap["statUpdate"]>[0]) => {
			this.emit("statUpdate", msg);
		});

		// M3: Class & Skill messages
		this.room.onMessage("class_select_prompt", () => {
			this.emit("classSelectPrompt");
		});

		this.room.onMessage("skill_effect", (msg: SkillEffectMsg) => {
			this.emit("skillEffect", msg);
		});

		this.room.onMessage("projectile_spawn", (msg: ProjectileSpawnMsg) => {
			this.emit("projectileSpawn", msg);
		});

		this.room.onMessage("buff_apply", (msg: BuffApplyMsg) => {
			this.emit("buffApply", msg);
		});

		this.room.onMessage("heal_effect", (msg: HealEffectMsg) => {
			this.emit("healEffect", msg);
		});

		// M3: Inventory messages
		this.room.onMessage("inventory_sync", (msg: InventorySyncMsg) => {
			this.emit("inventorySync", msg);
		});

		this.room.onMessage("upgrade_result", (msg: UpgradeResultMsg) => {
			this.emit("upgradeResult", msg);
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
