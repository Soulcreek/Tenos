// Re-export all core ECS components from the canonical location
export {
	Position,
	Velocity,
	Rotation,
	NetworkIdentity,
	MeshRef,
	LocalPlayer,
	RemotePlayer,
} from "./components/core.js";

// Re-export combat components
export {
	Health,
	Mana,
	CombatStats,
	Target,
	AutoAttack,
	Dead,
	Monster,
	AIState,
	AI_STATE,
	PendingXP,
	LootDrop,
	Spawner,
	ClassInfo,
	CLASS_ID,
	SkillCooldown,
	Projectile,
	Buff,
} from "./components/combat.js";
