import {
	AIState,
	AI_STATE,
	AutoAttack,
	Dead,
	Health,
	MONSTER_ATTACK_RANGE,
	MONSTER_CHASE_SPEED,
	Monster,
	Position,
	Rotation,
	Target,
	Velocity,
} from "@tenos/shared";
import { Not, defineQuery, hasComponent } from "bitecs";
import type { IWorld } from "bitecs";

const monsterAIQuery = defineQuery([Monster, AIState, Position, Velocity, Health, Not(Dead)]);
const alivePlayerQuery = defineQuery([Health, Not(Monster), Not(Dead)]);

/**
 * Monster AI finite state machine.
 * States: IDLE → CHASE → ATTACK → RETURN → DEAD
 */
export function monsterAISystem(world: IWorld, dt: number): void {
	const monsters = monsterAIQuery(world);
	const players = alivePlayerQuery(world);

	for (let i = 0; i < monsters.length; i++) {
		const eid = monsters[i];
		const state = AIState.state[eid];

		switch (state) {
			case AI_STATE.IDLE:
				handleIdle(world, eid, players);
				break;
			case AI_STATE.CHASE:
				handleChase(world, eid, dt);
				break;
			case AI_STATE.ATTACK:
				handleAttack(world, eid);
				break;
			case AI_STATE.RETURN:
				handleReturn(world, eid, dt);
				break;
		}
	}
}

function handleIdle(world: IWorld, eid: number, players: number[]): void {
	const aggroRange = AIState.aggroRange[eid];
	const aggroRangeSq = aggroRange * aggroRange;

	// Find closest player in aggro range
	let closestEid = 0;
	let closestDistSq = aggroRangeSq;

	for (let j = 0; j < players.length; j++) {
		const playerEid = players[j];
		// Skip entities that are also monsters (players only)
		if (hasComponent(world, Monster, playerEid)) continue;

		const dx = Position.x[playerEid] - Position.x[eid];
		const dz = Position.z[playerEid] - Position.z[eid];
		const distSq = dx * dx + dz * dz;

		if (distSq < closestDistSq) {
			closestDistSq = distSq;
			closestEid = playerEid;
		}
	}

	if (closestEid !== 0) {
		AIState.state[eid] = AI_STATE.CHASE;
		AIState.targetEid[eid] = closestEid;
		Target.eid[eid] = closestEid;
	}
}

function handleChase(world: IWorld, eid: number, _dt: number): void {
	const targetEid = AIState.targetEid[eid];

	// Check if target is still valid
	if (targetEid === 0 || hasComponent(world, Dead, targetEid)) {
		transitionToReturn(eid);
		return;
	}

	// Check leash distance from spawn
	const dx = Position.x[eid] - AIState.spawnX[eid];
	const dz = Position.z[eid] - AIState.spawnZ[eid];
	const distFromSpawnSq = dx * dx + dz * dz;
	const leashSq = AIState.leashRange[eid] * AIState.leashRange[eid];

	if (distFromSpawnSq > leashSq) {
		transitionToReturn(eid);
		return;
	}

	// Move toward target
	const toX = Position.x[targetEid] - Position.x[eid];
	const toZ = Position.z[targetEid] - Position.z[eid];
	const dist = Math.sqrt(toX * toX + toZ * toZ);

	if (dist <= MONSTER_ATTACK_RANGE) {
		// In attack range
		AIState.state[eid] = AI_STATE.ATTACK;
		AutoAttack.active[eid] = 1;
		Velocity.x[eid] = 0;
		Velocity.z[eid] = 0;
		return;
	}

	// Chase
	const speed = MONSTER_CHASE_SPEED * 5; // base 5 u/s * multiplier
	const nx = toX / dist;
	const nz = toZ / dist;
	Velocity.x[eid] = nx * speed;
	Velocity.z[eid] = nz * speed;

	// Face movement direction
	Rotation.y[eid] = Math.atan2(nx, nz);
}

function handleAttack(world: IWorld, eid: number): void {
	const targetEid = AIState.targetEid[eid];

	// Check if target is still valid
	if (targetEid === 0 || hasComponent(world, Dead, targetEid)) {
		transitionToReturn(eid);
		return;
	}

	// Check if target moved out of range
	const dx = Position.x[targetEid] - Position.x[eid];
	const dz = Position.z[targetEid] - Position.z[eid];
	const distSq = dx * dx + dz * dz;

	// Slightly larger range than attack range to prevent jitter
	const breakRange = MONSTER_ATTACK_RANGE * 1.5;
	if (distSq > breakRange * breakRange) {
		AIState.state[eid] = AI_STATE.CHASE;
		AutoAttack.active[eid] = 0;
	}

	// Face target
	const dist = Math.sqrt(distSq);
	if (dist > 0.01) {
		Rotation.y[eid] = Math.atan2(dx / dist, dz / dist);
	}
}

function handleReturn(_world: IWorld, eid: number, _dt: number): void {
	const toX = AIState.spawnX[eid] - Position.x[eid];
	const toZ = AIState.spawnZ[eid] - Position.z[eid];
	const dist = Math.sqrt(toX * toX + toZ * toZ);

	if (dist < 1.0) {
		// Back at spawn
		AIState.state[eid] = AI_STATE.IDLE;
		Velocity.x[eid] = 0;
		Velocity.z[eid] = 0;

		// Heal to full when returning
		Health.current[eid] = Health.max[eid];
		return;
	}

	// Move toward spawn
	const speed = MONSTER_CHASE_SPEED * 5;
	const nx = toX / dist;
	const nz = toZ / dist;
	Velocity.x[eid] = nx * speed;
	Velocity.z[eid] = nz * speed;
	Rotation.y[eid] = Math.atan2(nx, nz);
}

function transitionToReturn(eid: number): void {
	AIState.state[eid] = AI_STATE.RETURN;
	AIState.targetEid[eid] = 0;
	Target.eid[eid] = 0;
	AutoAttack.active[eid] = 0;
}
