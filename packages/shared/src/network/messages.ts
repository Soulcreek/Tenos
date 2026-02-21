export enum MessageType {
	PlayerInput = "player_input",
	StateSnapshot = "state_snapshot",
	PlayerJoin = "player_join",
	PlayerLeave = "player_leave",

	// ── Combat Messages (M2) ──────────────────────────────────
	SelectTarget = "select_target",
	RequestAttack = "request_attack",
	Damage = "damage",
	EntityDied = "entity_died",
	XPGain = "xp_gain",
	LevelUp = "level_up",
	LootSpawn = "loot_spawn",
	LootPickup = "loot_pickup",
	PickupLoot = "pickup_loot",
	AllocateStat = "allocate_stat",
	PlayerRespawn = "player_respawn",
	CombatLog = "combat_log",

	// ── Class & Skill Messages (M3) ──────────────────────────
	ClassSelect = "class_select",
	UseSkill = "use_skill",
	SkillEffect = "skill_effect",
	ProjectileSpawn = "projectile_spawn",
	BuffApply = "buff_apply",
	HealEffect = "heal_effect",

	// ── Inventory Messages (M3) ──────────────────────────────
	InventorySync = "inventory_sync",
	InventoryUpdate = "inventory_update",
	EquipItem = "equip_item",
	UnequipItem = "unequip_item",
	DropItem = "drop_item",
	UseItem = "use_item",
	UpgradeItem = "upgrade_item",
	UpgradeResult = "upgrade_result",
}

export interface PlayerInput {
	type: MessageType.PlayerInput;
	tick: number;
	moveX: number;
	moveZ: number;
	jump: boolean;
}

// ── Combat Message Payloads ────────────────────────────────────

/** Client → Server: player selects a target. */
export interface SelectTargetMsg {
	/** Network ID of the target entity (0 = deselect). */
	netId: number;
}

/** Client → Server: request to start auto-attacking current target. */
export interface RequestAttackMsg {
	/** Network ID of the target. */
	netId: number;
}

/** Server → Client: damage dealt to an entity. */
export interface DamageMsg {
	/** Network ID of the target that took damage. */
	targetNetId: number;
	/** Network ID of the attacker. */
	attackerNetId: number;
	/** Amount of damage dealt. */
	amount: number;
	/** Whether this was a critical hit. */
	isCrit: boolean;
	/** Remaining HP of the target. */
	remainingHp: number;
}

/** Server → Client: an entity has died. */
export interface EntityDiedMsg {
	/** Network ID of the dead entity. */
	netId: number;
	/** Network ID of the killer (0 = environment). */
	killerNetId: number;
	/** Whether the dead entity is a monster. */
	isMonster: boolean;
}

/** Server → Client (unicast): XP gained. */
export interface XPGainMsg {
	/** Amount of XP gained. */
	amount: number;
	/** Total XP after gain. */
	totalXP: number;
	/** XP needed for next level. */
	xpToLevel: number;
}

/** Server → Client (unicast): player leveled up. */
export interface LevelUpMsg {
	/** New level. */
	newLevel: number;
	/** Stat points available. */
	statPoints: number;
	/** New max HP. */
	hpMax: number;
	/** New max MP. */
	mpMax: number;
}

/** Server → Client: loot dropped on the ground. */
export interface LootSpawnMsg {
	/** Network ID of the loot entity. */
	netId: number;
	/** Item ID. */
	itemId: number;
	/** Item name. */
	name: string;
	/** Quantity. */
	qty: number;
	/** World position X. */
	x: number;
	/** World position Z. */
	z: number;
}

/** Client → Server: request to pick up loot. */
export interface PickupLootMsg {
	/** Network ID of the loot entity. */
	netId: number;
}

/** Server → Client (unicast): loot picked up successfully. */
export interface LootPickupMsg {
	/** Item ID. */
	itemId: number;
	/** Item name. */
	name: string;
	/** Quantity. */
	qty: number;
}

/** Client → Server: allocate a stat point. */
export interface AllocateStatMsg {
	/** Stat to allocate to: "str", "dex", "int", or "vit". */
	stat: "str" | "dex" | "int" | "vit";
}

/** Server → Client: player has respawned. */
export interface PlayerRespawnMsg {
	/** Network ID of the respawned player. */
	netId: number;
	/** Respawn position X. */
	x: number;
	/** Respawn position Z. */
	z: number;
}

/** Server → Client: combat log text. */
export interface CombatLogMsg {
	text: string;
}

// ── Class & Skill Message Payloads ─────────────────────────────

/** Client → Server: select class on first join. */
export interface ClassSelectMsg {
	characterClass: string;
}

/** Client → Server: use active skill. */
export interface UseSkillMsg {
	slot: number;
}

/** Server → Client: skill was used (for VFX). */
export interface SkillEffectMsg {
	casterNetId: number;
	skillId: string;
	targetNetId: number;
}

/** Server → Client: projectile spawned. */
export interface ProjectileSpawnMsg {
	id: number;
	fromX: number;
	fromZ: number;
	toNetId: number;
	speed: number;
	type: "bolt" | "arrow";
}

/** Server → Client: buff applied. */
export interface BuffApplyMsg {
	targetNetId: number;
	buffId: string;
	duration: number;
}

/** Server → Client: heal applied. */
export interface HealEffectMsg {
	targetNetId: number;
	amount: number;
}

// ── Inventory Message Payloads ─────────────────────────────────

import type { EquipmentSlots, InventorySlot } from "../data/inventory.js";

/** Server → Client: full inventory sync. */
export interface InventorySyncMsg {
	inventory: (InventorySlot | null)[];
	equipment: EquipmentSlots;
	yang: number;
}

/** Server → Client: single slot update. */
export interface InventoryUpdateMsg {
	slot: number;
	itemId: number;
	qty: number;
	upgradeLevel: number;
}

/** Client → Server: equip item from inventory. */
export interface EquipItemMsg {
	inventorySlot: number;
}

/** Client → Server: unequip item to inventory. */
export interface UnequipItemMsg {
	equipSlot: string;
}

/** Client → Server: drop item from inventory. */
export interface DropItemMsg {
	inventorySlot: number;
	quantity: number;
}

/** Client → Server: use consumable item. */
export interface UseItemMsg {
	inventorySlot: number;
}

/** Client → Server: upgrade an equipment item. */
export interface UpgradeItemMsg {
	inventorySlot: number;
	useWardingSeal: boolean;
}

/** Server → Client: upgrade result. */
export interface UpgradeResultMsg {
	success: boolean;
	newLevel: number;
	destroyed: boolean;
	itemName: string;
}
