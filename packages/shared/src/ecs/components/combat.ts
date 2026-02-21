import { Types, defineComponent } from "bitecs";

// ── Combat Components ──────────────────────────────────────────
// Used on server for authoritative simulation. Client reads via Colyseus schema.

/** Hit points (current + max). */
export const Health = defineComponent({
	current: Types.f32,
	max: Types.f32,
	/** HP regen per second. */
	regenRate: Types.f32,
});

/** Mana points (current + max). */
export const Mana = defineComponent({
	current: Types.f32,
	max: Types.f32,
	/** MP regen per second. */
	regenRate: Types.f32,
});

/** Base + allocated combat stats. */
export const CombatStats = defineComponent({
	level: Types.ui16,
	xp: Types.ui32,
	/** Unspent stat points. */
	statPoints: Types.ui16,
	str: Types.ui16,
	dex: Types.ui16,
	int: Types.ui16,
	vit: Types.ui16,
	/** Derived: physical attack power. */
	attackPower: Types.f32,
	/** Derived: physical defense. */
	defense: Types.f32,
	/** Derived: attack speed (attacks per second). */
	attackSpeed: Types.f32,
	/** Derived: critical hit chance (0-1). */
	critChance: Types.f32,
	/** Derived: movement speed multiplier. */
	moveSpeed: Types.f32,
});

/** Current target entity ID (0 = no target). */
export const Target = defineComponent({
	/** ECS entity ID of the target. */
	eid: Types.ui32,
});

/** Auto-attack state. */
export const AutoAttack = defineComponent({
	/** Time remaining before next attack (seconds). */
	cooldown: Types.f32,
	/** Range in world units. */
	range: Types.f32,
	/** Whether auto-attack is active (1 = yes, 0 = no). */
	active: Types.ui8,
});

/** Tag: entity is dead. */
export const Dead = defineComponent();

/** Tag: entity is a monster. */
export const Monster = defineComponent({
	/** Monster type ID (index into monster definitions). */
	typeId: Types.ui16,
});

/** Monster AI finite state machine. */
export const AIState = defineComponent({
	/** Current state: 0=IDLE, 1=CHASE, 2=ATTACK, 3=RETURN, 4=DEAD. */
	state: Types.ui8,
	/** Aggro range (units). */
	aggroRange: Types.f32,
	/** Leash range from spawn point (units). */
	leashRange: Types.f32,
	/** Spawn origin X. */
	spawnX: Types.f32,
	/** Spawn origin Z. */
	spawnZ: Types.f32,
	/** Current target entity ID for AI. */
	targetEid: Types.ui32,
});

/** AI state enum values. */
export const AI_STATE = {
	IDLE: 0,
	CHASE: 1,
	ATTACK: 2,
	RETURN: 3,
	DEAD: 4,
} as const;

/** Pending XP to process (added when monster dies). */
export const PendingXP = defineComponent({
	amount: Types.ui32,
});

/** Loot drop entity. */
export const LootDrop = defineComponent({
	/** Item ID. */
	itemId: Types.ui16,
	/** Quantity. */
	quantity: Types.ui8,
	/** Time remaining before despawn (seconds). */
	despawnTimer: Types.f32,
	/** Owner session ID hash (0 = free for all). */
	ownerHash: Types.ui32,
});

/** Character class identifier: 0=warrior, 1=magician, 2=assassin. */
export const ClassInfo = defineComponent({
	classId: Types.ui8,
});

/** Class ID enum values. */
export const CLASS_ID = {
	WARRIOR: 0,
	MAGICIAN: 1,
	ASSASSIN: 2,
} as const;

/** Skill cooldown timers for 2 active skill slots. */
export const SkillCooldown = defineComponent({
	slot1Cd: Types.f32,
	slot2Cd: Types.f32,
});

/** Projectile entity (bolt or arrow). */
export const Projectile = defineComponent({
	ownerEid: Types.ui32,
	targetEid: Types.ui32,
	speed: Types.f32,
	damage: Types.f32,
	isMagic: Types.ui8,
	isCrit: Types.ui8,
	lifetime: Types.f32,
});

/** Active buff on an entity. */
export const Buff = defineComponent({
	/** Buff identifier: 1=iron_will. */
	buffId: Types.ui8,
	duration: Types.f32,
	magnitude: Types.f32,
});

/** Spawner component for monster spawn points. */
export const Spawner = defineComponent({
	/** Monster type ID to spawn. */
	typeId: Types.ui16,
	/** Respawn delay in seconds. */
	respawnDelay: Types.f32,
	/** Current respawn timer (0 = ready to spawn). */
	respawnTimer: Types.f32,
	/** Entity ID of the currently spawned monster (0 = none). */
	spawnedEid: Types.ui32,
	/** Spawn position X. */
	x: Types.f32,
	/** Spawn position Z. */
	z: Types.f32,
});
