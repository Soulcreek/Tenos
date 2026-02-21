import {
	AIState,
	AI_STATE,
	AutoAttack,
	CombatStats,
	Health,
	MONSTER_ATTACK_RANGE,
	Monster,
	type MonsterDef,
	NetworkIdentity,
	Position,
	Rotation,
	Spawner,
	Target,
	Velocity,
} from "@tenos/shared";
import { addComponent, addEntity, defineQuery } from "bitecs";
import type { IWorld } from "bitecs";

const spawnerQuery = defineQuery([Spawner]);

/**
 * Creates monster entities from spawner definitions.
 * Manages respawn by watching spawner timers.
 */
export function spawnSystem(
	world: IWorld,
	dt: number,
	monsterDefs: Record<number, MonsterDef>,
	getNextNetId: () => number,
): number[] {
	const newMonsters: number[] = [];
	const spawners = spawnerQuery(world);

	for (let i = 0; i < spawners.length; i++) {
		const sid = spawners[i];

		// If monster is already spawned, skip
		if (Spawner.spawnedEid[sid] !== 0) continue;

		// Tick respawn timer
		if (Spawner.respawnTimer[sid] > 0) {
			Spawner.respawnTimer[sid] -= dt;
			continue;
		}

		// Spawn the monster
		const typeId = Spawner.typeId[sid];
		const def = monsterDefs[typeId];
		if (!def) continue;

		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);
		addComponent(world, NetworkIdentity, eid);
		addComponent(world, Health, eid);
		addComponent(world, CombatStats, eid);
		addComponent(world, Target, eid);
		addComponent(world, AutoAttack, eid);
		addComponent(world, Monster, eid);
		addComponent(world, AIState, eid);

		// Set position
		Position.x[eid] = Spawner.x[sid];
		Position.y[eid] = 0;
		Position.z[eid] = Spawner.z[sid];

		// Set network identity
		const netId = getNextNetId();
		NetworkIdentity.netId[eid] = netId;
		NetworkIdentity.ownerId[eid] = 0; // server-owned

		// Set health
		Health.current[eid] = def.hp;
		Health.max[eid] = def.hp;
		Health.regenRate[eid] = 0; // monsters don't regen in combat

		// Set combat stats
		CombatStats.level[eid] = def.level;
		CombatStats.attackPower[eid] = def.attack;
		CombatStats.defense[eid] = def.defense;
		CombatStats.attackSpeed[eid] = def.attackSpeed;
		CombatStats.moveSpeed[eid] = def.moveSpeed;
		CombatStats.critChance[eid] = 0.05;

		// Set auto-attack
		AutoAttack.range[eid] = MONSTER_ATTACK_RANGE;
		AutoAttack.active[eid] = 0;
		AutoAttack.cooldown[eid] = 0;

		// Set monster type
		Monster.typeId[eid] = typeId;

		// Set AI state
		AIState.state[eid] = AI_STATE.IDLE;
		AIState.aggroRange[eid] = def.aggroRange;
		AIState.leashRange[eid] = def.leashRange;
		AIState.spawnX[eid] = Spawner.x[sid];
		AIState.spawnZ[eid] = Spawner.z[sid];
		AIState.targetEid[eid] = 0;

		// Link spawner to monster
		Spawner.spawnedEid[sid] = eid;

		newMonsters.push(eid);
	}

	return newMonsters;
}
