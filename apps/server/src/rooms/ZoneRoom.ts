import { MapSchema, Schema, defineTypes } from "@colyseus/schema";
import {
	AutoAttack,
	BASE_STATS,
	Buff,
	CHARACTER_CLASSES,
	CLASS_ID,
	type CharacterClass,
	ClassInfo,
	CombatStats,
	Dead,
	Health,
	ITEM_CATALOG,
	LOOT_DESPAWN_TIME,
	LOOT_OWNER_TIME,
	LootDrop,
	MELEE_RANGE,
	MONSTER_TYPES,
	Mana,
	Monster,
	type MonsterDef,
	NetworkIdentity,
	PendingXP,
	Position,
	Rotation,
	SHINSOO_SPAWNS,
	SKILL_DEFS,
	SkillCooldown,
	Spawner,
	TICK_INTERVAL_MS,
	Target,
	Velocity,
	XP_TABLE,
	calculateXPPenalty,
	recalculateDerivedStats,
	rollLoot,
} from "@tenos/shared";
import { createWorld } from "@tenos/shared";
import { addComponent, addEntity, defineQuery, hasComponent, removeEntity } from "bitecs";
import { type Client, Room } from "colyseus";
import { type DamageEvent, autoAttackSystem } from "../ecs/systems/AutoAttackSystem.js";
import { deathSystem } from "../ecs/systems/DeathSystem.js";
import { healthRegenSystem } from "../ecs/systems/HealthRegenSystem.js";
import { lootDropSystem } from "../ecs/systems/LootDropSystem.js";
import { monsterAISystem } from "../ecs/systems/MonsterAISystem.js";
import { projectileSystem } from "../ecs/systems/ProjectileSystem.js";
import { respawnSystem } from "../ecs/systems/RespawnSystem.js";
import { processSkillUse } from "../ecs/systems/SkillSystem.js";
import { spawnSystem } from "../ecs/systems/SpawnSystem.js";
import { xpSystem } from "../ecs/systems/XPSystem.js";
import {
	type CharacterSaveData,
	createCharacter,
	findOrCreatePlayer,
	loadCharacter,
	loadEquipment,
	loadInventory,
	loadYang,
	saveCharacter,
	saveCharactersBatch,
	saveEquipment,
	saveInventory,
	saveYang,
} from "../services/CharacterService.js";
import * as InventoryService from "../services/InventoryService.js";

// ── Colyseus State Schema ──────────────────────────────────────

class PlayerState extends Schema {
	netId = 0;
	x = 0;
	y = 0;
	z = 0;
	rotY = 0;
	name = "";
	hp = 100;
	hpMax = 100;
	mp = 50;
	mpMax = 50;
	level = 1;
	targetNetId = 0;
	isDead = false;
	characterClass = "warrior";
}

defineTypes(PlayerState, {
	netId: "number",
	x: "number",
	y: "number",
	z: "number",
	rotY: "number",
	name: "string",
	hp: "number",
	hpMax: "number",
	mp: "number",
	mpMax: "number",
	level: "number",
	targetNetId: "number",
	isDead: "boolean",
	characterClass: "string",
});

class MonsterState extends Schema {
	netId = 0;
	typeId = 0;
	x = 0;
	y = 0;
	z = 0;
	rotY = 0;
	hp = 0;
	hpMax = 0;
	level = 0;
	isDead = false;
}

defineTypes(MonsterState, {
	netId: "number",
	typeId: "number",
	x: "number",
	y: "number",
	z: "number",
	rotY: "number",
	hp: "number",
	hpMax: "number",
	level: "number",
	isDead: "boolean",
});

class LootState extends Schema {
	netId = 0;
	itemId = 0;
	name = "";
	qty = 0;
	x = 0;
	z = 0;
}

defineTypes(LootState, {
	netId: "number",
	itemId: "number",
	name: "string",
	qty: "number",
	x: "number",
	z: "number",
});

class ZoneState extends Schema {
	players = new MapSchema<PlayerState>();
	monsters = new MapSchema<MonsterState>();
	loot = new MapSchema<LootState>();
	playerCount = 0;
	zoneName = "";
}

defineTypes(ZoneState, {
	players: { map: PlayerState },
	monsters: { map: MonsterState },
	loot: { map: LootState },
	playerCount: "number",
	zoneName: "string",
});

// ── ECS Queries ────────────────────────────────────────────────

const allPlayersQuery = defineQuery([Position, Velocity, NetworkIdentity]);
const monsterQuery = defineQuery([Monster, Position, NetworkIdentity]);

// ── Session → Entity mapping ───────────────────────────────────

interface PlayerEntry {
	eid: number;
	sessionId: string;
	netId: number;
	characterId: number;
	characterName: string;
	characterClass: CharacterClass;
}

/**
 * Authoritative zone room with combat system.
 */
export class ZoneRoom extends Room<ZoneState> {
	private world = createWorld();
	private players = new Map<string, PlayerEntry>();
	private tickInterval: ReturnType<typeof setInterval> | null = null;
	private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
	private nextNetId = 1;

	/** Maps netId → ECS entity ID for fast lookup. */
	private netIdToEid = new Map<number, number>();
	/** Maps ECS entity ID → netId. */
	private eidToNetId = new Map<number, number>();
	/** Maps monster ECS entity ID → spawner ECS entity ID. */
	private monsterSpawnerMap = new Map<number, number>();
	/** Maps netId → MonsterState key in schema. */
	private monsterNetIdToKey = new Map<number, string>();
	/** Maps netId → LootState key in schema. */
	private lootNetIdToKey = new Map<number, string>();
	/** Maps ECS entity ID → last attacker ECS entity ID. */
	private lastHitMap = new Map<number, number>();
	/** Respawn timers: entity ID → remaining seconds. */
	private respawnTimers = new Map<number, number>();

	onCreate(options: { zoneName?: string }) {
		const zoneName = options.zoneName ?? "village-shinsoo";
		this.setState(new ZoneState());
		this.state.zoneName = zoneName;

		// ── Message Handlers ────────────────────────────────────
		this.onMessage("input", (client, data: { moveX: number; moveZ: number; jump: boolean }) => {
			this.handleInput(client.sessionId, data);
		});

		this.onMessage("select_target", (client, data: { netId: number }) => {
			this.handleSelectTarget(client.sessionId, data.netId);
		});

		this.onMessage("request_attack", (client, data: { netId: number }) => {
			this.handleRequestAttack(client.sessionId, data.netId);
		});

		this.onMessage("pickup_loot", (client, data: { netId: number }) => {
			this.handlePickupLoot(client, data.netId);
		});

		this.onMessage("allocate_stat", (client, data: { stat: string }) => {
			this.handleAllocateStat(client, data.stat);
		});

		this.onMessage("use_skill", (client, data: { slot: number }) => {
			this.handleUseSkill(client, data.slot);
		});

		this.onMessage("class_select", (client, data: { characterClass: string }) => {
			this.handleClassSelect(client, data.characterClass);
		});

		this.onMessage("equip_item", (client, data: { inventorySlot: number }) => {
			this.handleEquipItem(client, data.inventorySlot);
		});

		this.onMessage("unequip_item", (client, data: { equipSlot: string }) => {
			this.handleUnequipItem(client, data.equipSlot);
		});

		this.onMessage("drop_item", (client, data: { inventorySlot: number; quantity: number }) => {
			this.handleDropItem(client, data.inventorySlot, data.quantity);
		});

		this.onMessage("use_item", (client, data: { inventorySlot: number }) => {
			this.handleUseItem(client, data.inventorySlot);
		});

		this.onMessage(
			"upgrade_item",
			(client, data: { inventorySlot: number; useWardingSeal: boolean }) => {
				this.handleUpgradeItem(client, data.inventorySlot, data.useWardingSeal);
			},
		);

		// ── Initialize Spawners ─────────────────────────────────
		this.initializeSpawners();

		// ── Start tick ──────────────────────────────────────────
		this.tickInterval = setInterval(() => {
			this.tick();
		}, TICK_INTERVAL_MS);

		// ── Auto-save every 30 seconds ──────────────────────────
		this.autoSaveInterval = setInterval(() => {
			this.autoSaveAll();
		}, 30_000);

		console.log(`[ZoneRoom] Created: ${zoneName}`);
	}

	async onJoin(client: Client, options: { name?: string }) {
		const playerName = options.name ?? `Player-${this.nextNetId}`;

		// ── Load or create character from DB ─────────────────────
		let characterId = 0;
		let characterName = playerName;
		let charClass: CharacterClass = "warrior";
		let charLevel = 1;
		let charXp = 0;
		let charStatPoints = 0;
		let charStr: number = BASE_STATS.warrior.str;
		let charDex: number = BASE_STATS.warrior.dex;
		let charInt: number = BASE_STATS.warrior.int;
		let charVit: number = BASE_STATS.warrior.vit;
		let charPosX = 0;
		let charPosY = 0;
		let charPosZ = 0;
		let charHpCurrent = 0;
		let charMpCurrent = 0;
		let needsClassSelect = false;

		try {
			const playerId = await findOrCreatePlayer(playerName);
			const charData = await loadCharacter(playerId);

			if (!charData) {
				// Don't create character yet — wait for class selection
				needsClassSelect = true;
				console.log(`[ZoneRoom] New player ${playerName} needs class selection`);
			} else {
				console.log(
					`[ZoneRoom] Loaded character for ${playerName} (id=${charData.id}, level=${charData.level})`,
				);
				characterId = charData.id;
				characterName = charData.name;
				charClass = (
					CHARACTER_CLASSES.includes(charData.characterClass as CharacterClass)
						? charData.characterClass
						: "warrior"
				) as CharacterClass;
				charLevel = charData.level;
				charXp = charData.xp;
				charStatPoints = charData.statPoints;
				charStr = charData.str;
				charDex = charData.dex;
				charInt = charData.intStat;
				charVit = charData.vit;
				charPosX = charData.posX;
				charPosY = charData.posY;
				charPosZ = charData.posZ;
				charHpCurrent = charData.hpCurrent;
				charMpCurrent = charData.mpCurrent;
			}
		} catch (err) {
			console.error(
				`[ZoneRoom] DB error loading character for ${playerName}, using transient:`,
				err,
			);
		}

		if (needsClassSelect) {
			// Store pending player info and send class select prompt
			this.pendingClassSelects.set(client.sessionId, { playerName });
			client.send("class_select_prompt", {});
			return;
		}

		await this.finalizeJoin(client, {
			characterId,
			characterName,
			charClass,
			charLevel,
			charXp,
			charStatPoints,
			charStr,
			charDex,
			charInt,
			charVit,
			charPosX,
			charPosY,
			charPosZ,
			charHpCurrent,
			charMpCurrent,
		});
	}

	private pendingClassSelects = new Map<string, { playerName: string }>();

	private async handleClassSelect(client: Client, className: string) {
		const pending = this.pendingClassSelects.get(client.sessionId);
		if (!pending) return;

		const charClass = CHARACTER_CLASSES.includes(className as CharacterClass)
			? (className as CharacterClass)
			: "warrior";

		this.pendingClassSelects.delete(client.sessionId);

		const base = BASE_STATS[charClass];
		const derived = recalculateDerivedStats(base.str, base.dex, base.int, base.vit, 1, charClass);

		let characterId = 0;
		try {
			const playerId = await findOrCreatePlayer(pending.playerName);
			const charData = await createCharacter(
				playerId,
				pending.playerName,
				charClass,
				base,
				derived.hpMax,
				derived.mpMax,
			);
			characterId = charData.id;
			console.log(
				`[ZoneRoom] Created ${charClass} character for ${pending.playerName} (id=${characterId})`,
			);
		} catch (err) {
			console.error("[ZoneRoom] Failed to create character:", err);
		}

		await this.finalizeJoin(client, {
			characterId,
			characterName: pending.playerName,
			charClass,
			charLevel: 1,
			charXp: 0,
			charStatPoints: 0,
			charStr: base.str,
			charDex: base.dex,
			charInt: base.int,
			charVit: base.vit,
			charPosX: 0,
			charPosY: 0,
			charPosZ: 0,
			charHpCurrent: derived.hpMax,
			charMpCurrent: derived.mpMax,
		});
	}

	private async finalizeJoin(
		client: Client,
		opts: {
			characterId: number;
			characterName: string;
			charClass: CharacterClass;
			charLevel: number;
			charXp: number;
			charStatPoints: number;
			charStr: number;
			charDex: number;
			charInt: number;
			charVit: number;
			charPosX: number;
			charPosY: number;
			charPosZ: number;
			charHpCurrent: number;
			charMpCurrent: number;
		},
	) {
		const {
			characterId,
			characterName,
			charClass,
			charLevel,
			charXp,
			charStatPoints,
			charStr,
			charDex,
			charInt,
			charVit,
			charPosX,
			charPosY,
			charPosZ,
			charHpCurrent,
			charMpCurrent,
		} = opts;

		// ── Create ECS entity ────────────────────────────────────
		const eid = addEntity(this.world);
		addComponent(this.world, Position, eid);
		addComponent(this.world, Velocity, eid);
		addComponent(this.world, Rotation, eid);
		addComponent(this.world, NetworkIdentity, eid);
		addComponent(this.world, Health, eid);
		addComponent(this.world, Mana, eid);
		addComponent(this.world, CombatStats, eid);
		addComponent(this.world, Target, eid);
		addComponent(this.world, AutoAttack, eid);
		addComponent(this.world, ClassInfo, eid);
		addComponent(this.world, SkillCooldown, eid);

		// Assign network ID
		const netId = this.nextNetId++;
		NetworkIdentity.netId[eid] = netId;
		NetworkIdentity.ownerId[eid] = hashSessionId(client.sessionId);

		// Set class
		const classIdMap: Record<CharacterClass, number> = {
			warrior: CLASS_ID.WARRIOR,
			magician: CLASS_ID.MAGICIAN,
			assassin: CLASS_ID.ASSASSIN,
		};
		ClassInfo.classId[eid] = classIdMap[charClass] ?? CLASS_ID.WARRIOR;

		// Initialize stats from DB data
		CombatStats.level[eid] = charLevel;
		CombatStats.xp[eid] = charXp;
		CombatStats.statPoints[eid] = charStatPoints;
		CombatStats.str[eid] = charStr;
		CombatStats.dex[eid] = charDex;
		CombatStats.int[eid] = charInt;
		CombatStats.vit[eid] = charVit;

		// Recompute derived stats from base stats with class passives
		const derived = recalculateDerivedStats(
			charStr,
			charDex,
			charInt,
			charVit,
			charLevel,
			charClass,
		);
		Health.max[eid] = derived.hpMax;
		Health.regenRate[eid] = derived.hpRegen;
		Mana.max[eid] = derived.mpMax;
		Mana.regenRate[eid] = derived.mpRegen;
		CombatStats.attackPower[eid] = derived.attackPower;
		CombatStats.defense[eid] = derived.defense;
		CombatStats.attackSpeed[eid] = derived.attackSpeed;
		CombatStats.critChance[eid] = derived.critChance;
		CombatStats.moveSpeed[eid] = derived.moveSpeed;

		// Restore HP: use saved value if valid, otherwise full
		Health.current[eid] =
			charHpCurrent > 0 && charHpCurrent <= derived.hpMax ? charHpCurrent : derived.hpMax;
		Mana.current[eid] =
			charMpCurrent > 0 && charMpCurrent <= derived.mpMax ? charMpCurrent : derived.mpMax;

		// Auto-attack setup (range set based on class in system)
		AutoAttack.range[eid] = MELEE_RANGE;
		AutoAttack.active[eid] = 0;
		AutoAttack.cooldown[eid] = 0;

		// Skill cooldowns start at 0
		SkillCooldown.slot1Cd[eid] = 0;
		SkillCooldown.slot2Cd[eid] = 0;

		// Restore position from DB
		Position.x[eid] = charPosX;
		Position.y[eid] = charPosY;
		Position.z[eid] = charPosZ;

		// Track player
		this.players.set(client.sessionId, {
			eid,
			sessionId: client.sessionId,
			netId,
			characterId,
			characterName,
			characterClass: charClass,
		});
		this.netIdToEid.set(netId, eid);
		this.eidToNetId.set(eid, netId);

		// Add to Colyseus state
		const playerState = new PlayerState();
		playerState.netId = netId;
		playerState.name = characterName;
		playerState.characterClass = charClass;
		playerState.x = charPosX;
		playerState.y = charPosY;
		playerState.z = charPosZ;
		playerState.hp = Math.ceil(Health.current[eid]);
		playerState.hpMax = Math.ceil(derived.hpMax);
		playerState.mp = Math.ceil(Mana.current[eid]);
		playerState.mpMax = Math.ceil(derived.mpMax);
		playerState.level = charLevel;
		this.state.players.set(client.sessionId, playerState);
		this.state.playerCount = this.players.size;

		// ── Load & sync inventory ────────────────────────────────
		try {
			const invSlots = characterId ? await loadInventory(characterId) : undefined;
			const equipSlots = characterId ? await loadEquipment(characterId) : undefined;
			const yang = characterId ? await loadYang(characterId) : 0;
			InventoryService.initInventory(
				client.sessionId,
				invSlots ?? undefined,
				equipSlots ?? undefined,
				yang,
			);
		} catch (err) {
			console.error("[ZoneRoom] Failed to load inventory:", err);
			InventoryService.initInventory(client.sessionId);
		}

		// Apply equipment stat bonuses
		const equipBonus = InventoryService.getEquipmentBonuses(client.sessionId);
		CombatStats.attackPower[eid] += equipBonus.attack ?? 0;
		CombatStats.defense[eid] += equipBonus.defense ?? 0;

		// Send inventory sync to client
		const inv = InventoryService.getInventory(client.sessionId);
		if (inv) {
			client.send("inventory_sync", {
				inventory: inv.slots,
				equipment: inv.equipment,
				yang: inv.yang,
			});
		}

		console.log(
			`[ZoneRoom] Player joined: ${client.sessionId} (eid=${eid}, netId=${netId}, class=${charClass}, charId=${characterId})`,
		);
	}

	async onLeave(client: Client) {
		this.pendingClassSelects.delete(client.sessionId);
		const entry = this.players.get(client.sessionId);
		if (entry) {
			// Save character + inventory to DB before cleanup
			if (entry.characterId !== 0) {
				try {
					const data = this.extractSaveData(entry.eid);
					await saveCharacter(entry.characterId, data);
					const inv = InventoryService.getInventory(client.sessionId);
					if (inv) {
						await saveInventory(entry.characterId, inv.slots);
						await saveEquipment(entry.characterId, inv.equipment);
						await saveYang(entry.characterId, inv.yang);
					}
					console.log(
						`[ZoneRoom] Saved character ${entry.characterName} (id=${entry.characterId})`,
					);
				} catch (err) {
					console.error(`[ZoneRoom] Failed to save character ${entry.characterName}:`, err);
				}
			}

			InventoryService.removeInventory(client.sessionId);
			this.netIdToEid.delete(entry.netId);
			this.eidToNetId.delete(entry.eid);
			this.lastHitMap.delete(entry.eid);
			this.respawnTimers.delete(entry.eid);
			removeEntity(this.world, entry.eid);
			this.players.delete(client.sessionId);
			this.state.players.delete(client.sessionId);
			this.state.playerCount = this.players.size;
		}
		console.log(`[ZoneRoom] Player left: ${client.sessionId}`);
	}

	async onDispose() {
		if (this.tickInterval) clearInterval(this.tickInterval);
		if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);

		// Final save for all remaining players
		await this.autoSaveAll();
		console.log(`[ZoneRoom] Disposed: ${this.state.zoneName}`);
	}

	// ── Persistence Helpers ─────────────────────────────────────

	private extractSaveData(eid: number): Omit<CharacterSaveData, "characterId"> {
		return {
			zone: this.state.zoneName,
			posX: Position.x[eid],
			posY: Position.y[eid],
			posZ: Position.z[eid],
			level: CombatStats.level[eid],
			xp: CombatStats.xp[eid],
			statPoints: CombatStats.statPoints[eid],
			str: CombatStats.str[eid],
			dex: CombatStats.dex[eid],
			intStat: CombatStats.int[eid],
			vit: CombatStats.vit[eid],
			hpCurrent: Health.current[eid],
			mpCurrent: Mana.current[eid],
		};
	}

	private async autoSaveAll(): Promise<void> {
		const saves: CharacterSaveData[] = [];
		for (const [, entry] of this.players) {
			if (entry.characterId === 0) continue;
			saves.push({
				characterId: entry.characterId,
				...this.extractSaveData(entry.eid),
			});
		}

		if (saves.length === 0) return;

		try {
			await saveCharactersBatch(saves);
			console.log(`[ZoneRoom] Auto-saved ${saves.length} character(s)`);
		} catch (err) {
			console.error("[ZoneRoom] Auto-save failed:", err);
		}
	}

	// ── Input Processing ───────────────────────────────────────

	private handleInput(sessionId: string, data: { moveX: number; moveZ: number; jump: boolean }) {
		const entry = this.players.get(sessionId);
		if (!entry) return;
		if (hasComponent(this.world, Dead, entry.eid)) return;

		const eid = entry.eid;
		const speed = CombatStats.moveSpeed[eid] || 5.0;

		const mx = Math.max(-1, Math.min(1, data.moveX));
		const mz = Math.max(-1, Math.min(1, data.moveZ));

		Velocity.x[eid] = mx * speed;
		Velocity.z[eid] = mz * speed;

		if (mx !== 0 || mz !== 0) {
			Rotation.y[eid] = Math.atan2(mx, mz);
		}
	}

	private handleSelectTarget(sessionId: string, netId: number) {
		const entry = this.players.get(sessionId);
		if (!entry) return;

		const targetEid = netId === 0 ? 0 : (this.netIdToEid.get(netId) ?? 0);
		Target.eid[entry.eid] = targetEid;

		// Update player state for sync
		const ps = this.state.players.get(sessionId);
		if (ps) ps.targetNetId = netId;
	}

	private handleRequestAttack(sessionId: string, netId: number) {
		const entry = this.players.get(sessionId);
		if (!entry) return;
		if (hasComponent(this.world, Dead, entry.eid)) return;

		const targetEid = this.netIdToEid.get(netId);
		if (targetEid === undefined) return;
		if (hasComponent(this.world, Dead, targetEid)) return;

		// Cannot attack yourself
		if (targetEid === entry.eid) return;

		Target.eid[entry.eid] = targetEid;
		AutoAttack.active[entry.eid] = 1;
		AutoAttack.cooldown[entry.eid] = 0; // start attacking immediately

		const ps = this.state.players.get(sessionId);
		if (ps) ps.targetNetId = netId;
	}

	private handlePickupLoot(client: Client, netId: number) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;
		if (hasComponent(this.world, Dead, entry.eid)) return;

		const lootEid = this.netIdToEid.get(netId);
		if (lootEid === undefined) return;
		if (!hasComponent(this.world, LootDrop, lootEid)) return;

		// Check distance
		const dx = Position.x[lootEid] - Position.x[entry.eid];
		const dz = Position.z[lootEid] - Position.z[entry.eid];
		const distSq = dx * dx + dz * dz;
		if (distSq > 9) return; // max pickup range: 3 units

		// Check owner protection
		const ownerHash = LootDrop.ownerHash[lootEid];
		if (ownerHash !== 0) {
			const playerHash = hashSessionId(client.sessionId);
			if (
				ownerHash !== playerHash &&
				LootDrop.despawnTimer[lootEid] > LOOT_DESPAWN_TIME - LOOT_OWNER_TIME
			) {
				return; // Still owner-protected
			}
		}

		// Look up loot name from schema state
		const key = this.lootNetIdToKey.get(netId);
		const lootState = key ? this.state.loot.get(key) : undefined;
		const itemName = lootState?.name ?? "Item";
		const lootItemId = LootDrop.itemId[lootEid];
		const lootQty = LootDrop.quantity[lootEid];

		// Add to inventory
		const added = InventoryService.addItem(client.sessionId, lootItemId, lootQty);
		if (!added) {
			// Inventory full
			client.send("combat_log", { text: "Inventory is full!" });
			return;
		}

		// Send pickup notification to player
		client.send("loot_pickup", { itemId: lootItemId, name: itemName, qty: lootQty });

		// Send inventory update
		const inv = InventoryService.getInventory(client.sessionId);
		if (inv) {
			client.send("inventory_sync", {
				inventory: inv.slots,
				equipment: inv.equipment,
				yang: inv.yang,
			});
		}

		// Remove loot from world and schema
		if (key) {
			this.state.loot.delete(key);
			this.lootNetIdToKey.delete(netId);
		}
		this.netIdToEid.delete(netId);
		this.eidToNetId.delete(lootEid);
		removeEntity(this.world, lootEid);
	}

	private handleAllocateStat(client: Client, stat: string) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;

		const eid = entry.eid;
		if (CombatStats.statPoints[eid] <= 0) return;

		const validStats = ["str", "dex", "int", "vit"] as const;
		if (!validStats.includes(stat as (typeof validStats)[number])) return;

		CombatStats.statPoints[eid] -= 1;
		CombatStats[stat as "str" | "dex" | "int" | "vit"][eid] += 1;

		this.recalcPlayerStats(client.sessionId, eid);

		const derived = recalculateDerivedStats(
			CombatStats.str[eid],
			CombatStats.dex[eid],
			CombatStats.int[eid],
			CombatStats.vit[eid],
			CombatStats.level[eid],
			entry.characterClass,
		);

		client.send("stat_update", {
			str: CombatStats.str[eid],
			dex: CombatStats.dex[eid],
			int: CombatStats.int[eid],
			vit: CombatStats.vit[eid],
			statPoints: CombatStats.statPoints[eid],
			hpMax: derived.hpMax,
			mpMax: derived.mpMax,
			attackPower: derived.attackPower,
			defense: derived.defense,
			attackSpeed: derived.attackSpeed,
			critChance: derived.critChance,
			moveSpeed: derived.moveSpeed,
		});
	}

	/** Recalculate all derived stats + equipment bonuses for a player. */
	private recalcPlayerStats(sessionId: string, eid: number) {
		const entry = this.players.get(sessionId);
		if (!entry) return;

		const derived = recalculateDerivedStats(
			CombatStats.str[eid],
			CombatStats.dex[eid],
			CombatStats.int[eid],
			CombatStats.vit[eid],
			CombatStats.level[eid],
			entry.characterClass,
		);

		const equipBonus = InventoryService.getEquipmentBonuses(sessionId);

		Health.max[eid] = derived.hpMax;
		Health.regenRate[eid] = derived.hpRegen;
		Mana.max[eid] = derived.mpMax;
		Mana.regenRate[eid] = derived.mpRegen;
		CombatStats.attackPower[eid] = derived.attackPower + (equipBonus.attack ?? 0);
		CombatStats.defense[eid] = derived.defense + (equipBonus.defense ?? 0);
		CombatStats.attackSpeed[eid] = derived.attackSpeed;
		CombatStats.critChance[eid] = Math.min(0.5, derived.critChance + (equipBonus.critChance ?? 0));
		CombatStats.moveSpeed[eid] = derived.moveSpeed + (equipBonus.moveSpeed ?? 0);
	}

	// ── Spawner Initialization ─────────────────────────────────

	private initializeSpawners() {
		for (const spawn of SHINSOO_SPAWNS) {
			const def = MONSTER_TYPES[spawn.typeId];
			if (!def) continue;

			const eid = addEntity(this.world);
			addComponent(this.world, Spawner, eid);

			Spawner.typeId[eid] = spawn.typeId;
			Spawner.respawnDelay[eid] = spawn.respawnDelay ?? def.respawnDelay;
			Spawner.respawnTimer[eid] = 0; // spawn immediately
			Spawner.spawnedEid[eid] = 0;
			Spawner.x[eid] = spawn.x;
			Spawner.z[eid] = spawn.z;
		}
	}

	// ── Server Tick (20Hz) ─────────────────────────────────────

	private tick() {
		const dt = TICK_INTERVAL_MS / 1000;

		// 1. Monster AI
		monsterAISystem(this.world, dt);

		// 2. Movement (apply velocity to position)
		this.applyMovement(dt);

		// 3. Auto-Attack (class-aware with projectiles)
		const { events: meleeEvents, projectiles: autoProjectiles } = autoAttackSystem(
			this.world,
			dt,
			() => this.nextNetId++,
		);
		this.broadcastDamageEvents(meleeEvents);
		this.broadcastProjectileSpawns(autoProjectiles);

		// 4. Projectile System
		const { damages: projDamages } = projectileSystem(this.world, dt);
		this.broadcastDamageEvents(projDamages);

		// 5. Skill Cooldown tick
		this.tickSkillCooldowns(dt);

		// 6. Buff expiry
		this.tickBuffs(dt);

		// 7. Health Regen
		healthRegenSystem(this.world, dt);

		// 8. Death
		const deathEvents = deathSystem(this.world, this.lastHitMap);
		this.handleDeathEvents(deathEvents);

		// 9. XP
		const { xpEvents, levelEvents } = xpSystem(this.world);
		this.broadcastXPEvents(xpEvents);
		this.broadcastLevelEvents(levelEvents);

		// 10. Loot Despawn
		const despawnedLoot = lootDropSystem(this.world, dt);
		this.handleLootDespawn(despawnedLoot);

		// 11. Respawn
		const respawnEvents = respawnSystem(this.world, dt, this.respawnTimers, this.monsterSpawnerMap);
		this.handleRespawnEvents(respawnEvents);

		// 12. Spawn (new monsters from spawners)
		const newMonsters = spawnSystem(
			this.world,
			dt,
			MONSTER_TYPES as Record<number, MonsterDef>,
			() => this.nextNetId++,
		);
		this.registerNewMonsters(newMonsters);

		// 13. Sync ECS → Colyseus state
		this.syncState();
	}

	private applyMovement(dt: number) {
		const entities = allPlayersQuery(this.world);
		for (let i = 0; i < entities.length; i++) {
			const eid = entities[i];

			Position.x[eid] += Velocity.x[eid] * dt;
			Position.y[eid] += Velocity.y[eid] * dt;
			Position.z[eid] += Velocity.z[eid] * dt;

			// Boundary clamp
			const half = 64;
			Position.x[eid] = Math.max(-half, Math.min(half, Position.x[eid]));
			Position.z[eid] = Math.max(-half, Math.min(half, Position.z[eid]));

			if (Position.y[eid] < 0) {
				Position.y[eid] = 0;
				Velocity.y[eid] = 0;
			}
		}

		// Also move monsters
		const monsters = monsterQuery(this.world);
		for (let i = 0; i < monsters.length; i++) {
			const eid = monsters[i];
			Position.x[eid] += Velocity.x[eid] * dt;
			Position.y[eid] += Velocity.y[eid] * dt;
			Position.z[eid] += Velocity.z[eid] * dt;

			const half = 64;
			Position.x[eid] = Math.max(-half, Math.min(half, Position.x[eid]));
			Position.z[eid] = Math.max(-half, Math.min(half, Position.z[eid]));
		}
	}

	private broadcastDamageEvents(events: DamageEvent[]) {
		for (const event of events) {
			const attackerNetId = this.eidToNetId.get(event.attackerEid) ?? 0;
			const targetNetId = this.eidToNetId.get(event.targetEid) ?? 0;

			// Track last hitter for XP attribution
			this.lastHitMap.set(event.targetEid, event.attackerEid);

			this.broadcast("damage", {
				targetNetId,
				attackerNetId,
				amount: event.amount,
				isCrit: event.isCrit,
				remainingHp: event.remainingHp,
			});
		}
	}

	private handleDeathEvents(events: Array<{ eid: number; killerEid: number }>) {
		for (const event of events) {
			const netId = this.eidToNetId.get(event.eid) ?? 0;
			const killerNetId = this.eidToNetId.get(event.killerEid) ?? 0;
			const isMonster = hasComponent(this.world, Monster, event.eid);

			this.broadcast("entity_died", { netId, killerNetId, isMonster });

			if (isMonster) {
				// Award XP to killer
				if (event.killerEid !== 0 && !hasComponent(this.world, Monster, event.killerEid)) {
					const typeId = Monster.typeId[event.eid];
					const def = MONSTER_TYPES[typeId];
					if (def) {
						addComponent(this.world, PendingXP, event.killerEid);
						PendingXP.amount[event.killerEid] = def.xp;
					}
				}

				// Drop loot
				this.spawnLoot(event.eid, event.killerEid);
			} else {
				// Player death: apply XP penalty
				const level = CombatStats.level[event.eid];
				const xpForLevel = XP_TABLE[level] ?? 0;
				CombatStats.xp[event.eid] = calculateXPPenalty(CombatStats.xp[event.eid], xpForLevel);

				// Update schema isDead
				for (const [sessionId, entry] of this.players) {
					if (entry.eid === event.eid) {
						const ps = this.state.players.get(sessionId);
						if (ps) ps.isDead = true;

						// Find the client and send death penalty info
						for (const client of this.clients) {
							if (client.sessionId === sessionId) {
								client.send("player_death", {
									xpLost: Math.floor(xpForLevel * 0.05),
									respawnTime: 5,
								});
								break;
							}
						}
						break;
					}
				}

				// Clear any entities targeting this dead player
				for (const [, entry] of this.players) {
					if (Target.eid[entry.eid] === event.eid) {
						Target.eid[entry.eid] = 0;
						AutoAttack.active[entry.eid] = 0;
					}
				}
			}
		}
	}

	private spawnLoot(monsterEid: number, killerEid: number) {
		const typeId = Monster.typeId[monsterEid];
		const def = MONSTER_TYPES[typeId];
		if (!def) return;

		const drops = rollLoot(def.lootTableId);
		const ownerHash = killerEid !== 0 ? (NetworkIdentity.ownerId[killerEid] ?? 0) : 0;

		for (const drop of drops) {
			const eid = addEntity(this.world);
			addComponent(this.world, Position, eid);
			addComponent(this.world, NetworkIdentity, eid);
			addComponent(this.world, LootDrop, eid);

			const netId = this.nextNetId++;
			NetworkIdentity.netId[eid] = netId;
			NetworkIdentity.ownerId[eid] = 0;

			// Scatter loot slightly around monster death position
			const scatter = 1.5;
			Position.x[eid] = Position.x[monsterEid] + (Math.random() - 0.5) * scatter;
			Position.y[eid] = 0;
			Position.z[eid] = Position.z[monsterEid] + (Math.random() - 0.5) * scatter;

			LootDrop.itemId[eid] = drop.itemId;
			LootDrop.quantity[eid] = drop.qty;
			LootDrop.despawnTimer[eid] = LOOT_DESPAWN_TIME;
			LootDrop.ownerHash[eid] = ownerHash;

			// Register
			this.netIdToEid.set(netId, eid);
			this.eidToNetId.set(eid, netId);

			// Add to schema
			const key = `loot_${netId}`;
			const lootState = new LootState();
			lootState.netId = netId;
			lootState.itemId = drop.itemId;
			lootState.name = drop.name;
			lootState.qty = drop.qty;
			lootState.x = Position.x[eid];
			lootState.z = Position.z[eid];
			this.state.loot.set(key, lootState);
			this.lootNetIdToKey.set(netId, key);

			// Broadcast loot spawn
			this.broadcast("loot_spawn", {
				netId,
				itemId: drop.itemId,
				name: drop.name,
				qty: drop.qty,
				x: Position.x[eid],
				z: Position.z[eid],
			});
		}
	}

	private broadcastXPEvents(
		events: Array<{ eid: number; amount: number; totalXP: number; xpToLevel: number }>,
	) {
		for (const event of events) {
			// Find player client by eid
			for (const [sessionId, entry] of this.players) {
				if (entry.eid === event.eid) {
					for (const client of this.clients) {
						if (client.sessionId === sessionId) {
							client.send("xp_gain", {
								amount: event.amount,
								totalXP: event.totalXP,
								xpToLevel: event.xpToLevel,
							});
							break;
						}
					}
					break;
				}
			}
		}
	}

	private broadcastLevelEvents(
		events: Array<{
			eid: number;
			newLevel: number;
			statPoints: number;
			hpMax: number;
			mpMax: number;
		}>,
	) {
		for (const event of events) {
			for (const [sessionId, entry] of this.players) {
				if (entry.eid === event.eid) {
					for (const client of this.clients) {
						if (client.sessionId === sessionId) {
							client.send("level_up", {
								newLevel: event.newLevel,
								statPoints: event.statPoints,
								hpMax: event.hpMax,
								mpMax: event.mpMax,
							});
							break;
						}
					}
					break;
				}
			}
		}
	}

	private handleLootDespawn(despawnedEids: number[]) {
		for (const eid of despawnedEids) {
			const netId = this.eidToNetId.get(eid);
			if (netId !== undefined) {
				const key = this.lootNetIdToKey.get(netId);
				if (key) {
					this.state.loot.delete(key);
					this.lootNetIdToKey.delete(netId);
				}
				this.netIdToEid.delete(netId);
				this.eidToNetId.delete(eid);
			}
		}
	}

	private handleRespawnEvents(events: Array<{ eid: number; x: number; z: number }>) {
		for (const event of events) {
			const netId = this.eidToNetId.get(event.eid) ?? 0;

			// Update player schema
			for (const [sessionId, entry] of this.players) {
				if (entry.eid === event.eid) {
					const ps = this.state.players.get(sessionId);
					if (ps) {
						ps.isDead = false;
						ps.hp = Health.current[event.eid];
						ps.hpMax = Health.max[event.eid];
					}
					break;
				}
			}

			this.broadcast("player_respawn", {
				netId,
				x: event.x,
				z: event.z,
			});
		}
	}

	private registerNewMonsters(newMonsterEids: number[]) {
		for (const eid of newMonsterEids) {
			const netId = NetworkIdentity.netId[eid];
			this.netIdToEid.set(netId, eid);
			this.eidToNetId.set(eid, netId);

			// Find the spawner that owns this monster
			// The SpawnSystem sets Spawner.spawnedEid so we can look it up
			const spawnerEntities = defineQuery([Spawner])(this.world);
			for (let i = 0; i < spawnerEntities.length; i++) {
				const sid = spawnerEntities[i];
				if (Spawner.spawnedEid[sid] === eid) {
					this.monsterSpawnerMap.set(eid, sid);
					break;
				}
			}

			// Add to Colyseus state
			const typeId = Monster.typeId[eid];
			const def = MONSTER_TYPES[typeId];
			const key = `mob_${netId}`;
			const ms = new MonsterState();
			ms.netId = netId;
			ms.typeId = typeId;
			ms.x = Position.x[eid];
			ms.y = Position.y[eid];
			ms.z = Position.z[eid];
			ms.hp = Health.current[eid];
			ms.hpMax = Health.max[eid];
			ms.level = def?.level ?? 1;
			ms.isDead = false;
			this.state.monsters.set(key, ms);
			this.monsterNetIdToKey.set(netId, key);
		}
	}

	// ── Skill & Buff Handlers ──────────────────────────────────

	private handleUseSkill(client: Client, slot: number) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;
		if (hasComponent(this.world, Dead, entry.eid)) return;

		const { events, projectiles } = processSkillUse(
			this.world,
			entry.eid,
			slot,
			() => this.nextNetId++,
		);

		for (const event of events) {
			const casterNetId = this.eidToNetId.get(event.casterEid) ?? 0;
			const targetNetId = this.eidToNetId.get(event.targetEid) ?? 0;

			if (event.type === "damage") {
				this.lastHitMap.set(event.targetEid, event.casterEid);
				this.broadcast("damage", {
					targetNetId,
					attackerNetId: casterNetId,
					amount: event.amount,
					isCrit: event.isCrit,
					remainingHp: event.remainingHp,
				});
				this.broadcast("skill_effect", {
					casterNetId,
					skillId: event.skillId,
					targetNetId,
				});
			} else if (event.type === "heal") {
				this.broadcast("heal_effect", { targetNetId, amount: event.amount });
				this.broadcast("skill_effect", {
					casterNetId,
					skillId: event.skillId,
					targetNetId,
				});
			} else if (event.type === "buff") {
				this.broadcast("buff_apply", {
					targetNetId: casterNetId,
					buffId: event.skillId,
					duration: SKILL_DEFS[event.skillId]?.buffDuration ?? 8,
				});
				this.broadcast("skill_effect", {
					casterNetId,
					skillId: event.skillId,
					targetNetId: casterNetId,
				});
			}
		}

		this.broadcastProjectileSpawns(
			projectiles.map((p) => ({
				eid: p.eid,
				ownerEid: p.ownerEid,
				targetEid: p.targetEid,
				speed: p.speed,
				type: p.type,
			})),
		);
	}

	private broadcastProjectileSpawns(
		projectiles: Array<{
			eid: number;
			ownerEid: number;
			targetEid: number;
			speed: number;
			type: "bolt" | "arrow";
		}>,
	) {
		for (const proj of projectiles) {
			const toNetId = this.eidToNetId.get(proj.targetEid) ?? 0;
			this.broadcast("projectile_spawn", {
				id: NetworkIdentity.netId[proj.eid],
				fromX: Position.x[proj.eid],
				fromZ: Position.z[proj.eid],
				toNetId,
				speed: proj.speed,
				type: proj.type,
			});
		}
	}

	private tickSkillCooldowns(dt: number) {
		for (const [, entry] of this.players) {
			if (SkillCooldown.slot1Cd[entry.eid] > 0)
				SkillCooldown.slot1Cd[entry.eid] = Math.max(0, SkillCooldown.slot1Cd[entry.eid] - dt);
			if (SkillCooldown.slot2Cd[entry.eid] > 0)
				SkillCooldown.slot2Cd[entry.eid] = Math.max(0, SkillCooldown.slot2Cd[entry.eid] - dt);
		}
	}

	private tickBuffs(dt: number) {
		for (const [, entry] of this.players) {
			const eid = entry.eid;
			if (!hasComponent(this.world, Buff, eid)) continue;
			Buff.duration[eid] -= dt;
			if (Buff.duration[eid] <= 0) {
				// Remove buff and recalculate stats
				Buff.duration[eid] = 0;
				Buff.magnitude[eid] = 0;
				this.recalcPlayerStats(entry.sessionId, eid);
			}
		}
	}

	// ── Inventory Handlers ──────────────────────────────────

	private handleEquipItem(client: Client, invSlotIdx: number) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;

		const result = InventoryService.equipItem(
			client.sessionId,
			invSlotIdx,
			entry.characterClass,
			CombatStats.level[entry.eid],
		);
		if (!result.success) return;

		this.recalcPlayerStats(client.sessionId, entry.eid);
		this.syncInventoryToClient(client);
	}

	private handleUnequipItem(client: Client, equipSlot: string) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;

		if (!InventoryService.unequipItem(client.sessionId, equipSlot)) return;

		this.recalcPlayerStats(client.sessionId, entry.eid);
		this.syncInventoryToClient(client);
	}

	private handleDropItem(client: Client, invSlotIdx: number, quantity: number) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;

		const dropped = InventoryService.dropItem(client.sessionId, invSlotIdx, quantity);
		if (!dropped) return;

		// Spawn loot entity at player position
		const lootEid = addEntity(this.world);
		addComponent(this.world, Position, lootEid);
		addComponent(this.world, NetworkIdentity, lootEid);
		addComponent(this.world, LootDrop, lootEid);

		const netId = this.nextNetId++;
		NetworkIdentity.netId[lootEid] = netId;
		Position.x[lootEid] = Position.x[entry.eid] + (Math.random() - 0.5) * 2;
		Position.y[lootEid] = 0;
		Position.z[lootEid] = Position.z[entry.eid] + (Math.random() - 0.5) * 2;

		LootDrop.itemId[lootEid] = dropped.itemId;
		LootDrop.quantity[lootEid] = dropped.qty;
		LootDrop.despawnTimer[lootEid] = LOOT_DESPAWN_TIME;
		LootDrop.ownerHash[lootEid] = 0; // free for all

		this.netIdToEid.set(netId, lootEid);
		this.eidToNetId.set(lootEid, netId);

		const itemDef = ITEM_CATALOG[dropped.itemId];
		const itemName = itemDef
			? dropped.upgradeLevel > 0
				? `+${dropped.upgradeLevel} ${itemDef.name}`
				: itemDef.name
			: "Item";

		const key = `loot_${netId}`;
		const lootState = new LootState();
		lootState.netId = netId;
		lootState.itemId = dropped.itemId;
		lootState.name = itemName;
		lootState.qty = dropped.qty;
		lootState.x = Position.x[lootEid];
		lootState.z = Position.z[lootEid];
		this.state.loot.set(key, lootState);
		this.lootNetIdToKey.set(netId, key);

		this.broadcast("loot_spawn", {
			netId,
			itemId: dropped.itemId,
			name: itemName,
			qty: dropped.qty,
			x: Position.x[lootEid],
			z: Position.z[lootEid],
		});

		this.syncInventoryToClient(client);
	}

	private handleUseItem(client: Client, invSlotIdx: number) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;
		if (hasComponent(this.world, Dead, entry.eid)) return;

		const result = InventoryService.useItem(client.sessionId, invSlotIdx);
		if (!result) return;

		const eid = entry.eid;
		if (result.healAmount > 0) {
			Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + result.healAmount);
			this.broadcast("heal_effect", {
				targetNetId: entry.netId,
				amount: result.healAmount,
			});
		}
		if (result.manaAmount > 0) {
			Mana.current[eid] = Math.min(Mana.max[eid], Mana.current[eid] + result.manaAmount);
		}

		this.syncInventoryToClient(client);
	}

	private handleUpgradeItem(client: Client, invSlotIdx: number, useWardingSeal: boolean) {
		const entry = this.players.get(client.sessionId);
		if (!entry) return;

		const result = InventoryService.upgradeItem(client.sessionId, invSlotIdx, useWardingSeal);
		if (!result) return;

		client.send("upgrade_result", result);
		this.syncInventoryToClient(client);

		// Recalc stats in case equipped item was upgraded
		this.recalcPlayerStats(client.sessionId, entry.eid);
	}

	private syncInventoryToClient(client: Client) {
		const inv = InventoryService.getInventory(client.sessionId);
		if (inv) {
			client.send("inventory_sync", {
				inventory: inv.slots,
				equipment: inv.equipment,
				yang: inv.yang,
			});
		}
	}

	private syncState() {
		// Sync player ECS → Colyseus state
		for (const [sessionId, entry] of this.players) {
			const playerState = this.state.players.get(sessionId);
			if (!playerState) continue;
			playerState.x = Position.x[entry.eid];
			playerState.y = Position.y[entry.eid];
			playerState.z = Position.z[entry.eid];
			playerState.rotY = Rotation.y[entry.eid];
			playerState.hp = Math.ceil(Health.current[entry.eid]);
			playerState.hpMax = Math.ceil(Health.max[entry.eid]);
			playerState.mp = Math.ceil(Mana.current[entry.eid]);
			playerState.mpMax = Math.ceil(Mana.max[entry.eid]);
			playerState.level = CombatStats.level[entry.eid];
		}

		// Sync monster ECS → Colyseus state
		const monsters = monsterQuery(this.world);
		for (let i = 0; i < monsters.length; i++) {
			const eid = monsters[i];
			const netId = NetworkIdentity.netId[eid];
			const key = this.monsterNetIdToKey.get(netId);
			if (!key) continue;
			const ms = this.state.monsters.get(key);
			if (!ms) continue;

			ms.x = Position.x[eid];
			ms.y = Position.y[eid];
			ms.z = Position.z[eid];
			ms.rotY = Rotation.y[eid];
			ms.hp = Math.ceil(Health.current[eid]);
			ms.isDead = hasComponent(this.world, Dead, eid);
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
