import { describe, expect, test } from "bun:test";
import { addComponent, addEntity, defineQuery, hasComponent } from "bitecs";
import { createWorld } from "../world.js";
import {
	AIState,
	AI_STATE,
	AutoAttack,
	CombatStats,
	Dead,
	Health,
	LootDrop,
	Mana,
	Monster,
	PendingXP,
	Spawner,
	Target,
} from "./combat.js";

describe("Combat Components", () => {
	test("Health component stores f32 values", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Health, eid);

		Health.current[eid] = 150.5;
		Health.max[eid] = 200;
		Health.regenRate[eid] = 2.5;

		expect(Health.current[eid]).toBeCloseTo(150.5, 1);
		expect(Health.max[eid]).toBeCloseTo(200, 1);
		expect(Health.regenRate[eid]).toBeCloseTo(2.5, 1);
	});

	test("Mana component stores f32 values", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Mana, eid);

		Mana.current[eid] = 75;
		Mana.max[eid] = 100;
		Mana.regenRate[eid] = 1.5;

		expect(Mana.current[eid]).toBeCloseTo(75, 1);
		expect(Mana.max[eid]).toBeCloseTo(100, 1);
		expect(Mana.regenRate[eid]).toBeCloseTo(1.5, 1);
	});

	test("CombatStats component stores mixed types", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, CombatStats, eid);

		CombatStats.level[eid] = 5;
		CombatStats.xp[eid] = 1234;
		CombatStats.statPoints[eid] = 9;
		CombatStats.str[eid] = 15;
		CombatStats.dex[eid] = 10;
		CombatStats.int[eid] = 8;
		CombatStats.vit[eid] = 12;
		CombatStats.attackPower[eid] = 30.5;

		expect(CombatStats.level[eid]).toBe(5);
		expect(CombatStats.xp[eid]).toBe(1234);
		expect(CombatStats.statPoints[eid]).toBe(9);
		expect(CombatStats.str[eid]).toBe(15);
		expect(CombatStats.attackPower[eid]).toBeCloseTo(30.5, 1);
	});

	test("Target component stores entity ID", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Target, eid);

		Target.eid[eid] = 42;
		expect(Target.eid[eid]).toBe(42);

		Target.eid[eid] = 0;
		expect(Target.eid[eid]).toBe(0);
	});

	test("AutoAttack component stores attack state", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, AutoAttack, eid);

		AutoAttack.cooldown[eid] = 0.5;
		AutoAttack.range[eid] = 2.5;
		AutoAttack.active[eid] = 1;

		expect(AutoAttack.cooldown[eid]).toBeCloseTo(0.5, 1);
		expect(AutoAttack.range[eid]).toBeCloseTo(2.5, 1);
		expect(AutoAttack.active[eid]).toBe(1);
	});

	test("Dead is a tag component", () => {
		const world = createWorld();
		const eid = addEntity(world);

		expect(hasComponent(world, Dead, eid)).toBe(false);
		addComponent(world, Dead, eid);
		expect(hasComponent(world, Dead, eid)).toBe(true);
	});

	test("Monster component stores typeId", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Monster, eid);

		Monster.typeId[eid] = 3;
		expect(Monster.typeId[eid]).toBe(3);
	});

	test("AIState component stores FSM state", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, AIState, eid);

		AIState.state[eid] = AI_STATE.IDLE;
		expect(AIState.state[eid]).toBe(AI_STATE.IDLE);

		AIState.state[eid] = AI_STATE.CHASE;
		expect(AIState.state[eid]).toBe(AI_STATE.CHASE);

		AIState.aggroRange[eid] = 10;
		AIState.leashRange[eid] = 25;
		AIState.spawnX[eid] = 50;
		AIState.spawnZ[eid] = 30;

		expect(AIState.aggroRange[eid]).toBeCloseTo(10, 1);
		expect(AIState.leashRange[eid]).toBeCloseTo(25, 1);
		expect(AIState.spawnX[eid]).toBeCloseTo(50, 1);
		expect(AIState.spawnZ[eid]).toBeCloseTo(30, 1);
	});

	test("PendingXP component stores amount", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, PendingXP, eid);

		PendingXP.amount[eid] = 500;
		expect(PendingXP.amount[eid]).toBe(500);
	});

	test("LootDrop component stores item data", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, LootDrop, eid);

		LootDrop.itemId[eid] = 42;
		LootDrop.quantity[eid] = 3;
		LootDrop.despawnTimer[eid] = 60.0;
		LootDrop.ownerHash[eid] = 12345;

		expect(LootDrop.itemId[eid]).toBe(42);
		expect(LootDrop.quantity[eid]).toBe(3);
		expect(LootDrop.despawnTimer[eid]).toBeCloseTo(60.0, 1);
		expect(LootDrop.ownerHash[eid]).toBe(12345);
	});

	test("Spawner component stores spawn configuration", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Spawner, eid);

		Spawner.typeId[eid] = 2;
		Spawner.respawnDelay[eid] = 20;
		Spawner.respawnTimer[eid] = 15;
		Spawner.spawnedEid[eid] = 100;
		Spawner.x[eid] = 30;
		Spawner.z[eid] = -20;

		expect(Spawner.typeId[eid]).toBe(2);
		expect(Spawner.respawnDelay[eid]).toBeCloseTo(20, 1);
		expect(Spawner.spawnedEid[eid]).toBe(100);
		expect(Spawner.x[eid]).toBeCloseTo(30, 1);
		expect(Spawner.z[eid]).toBeCloseTo(-20, 1);
	});

	test("combat components are backed by TypedArrays", () => {
		expect(Health.current).toBeInstanceOf(Float32Array);
		expect(Health.max).toBeInstanceOf(Float32Array);
		expect(CombatStats.level).toBeInstanceOf(Uint16Array);
		expect(CombatStats.xp).toBeInstanceOf(Uint32Array);
		expect(CombatStats.str).toBeInstanceOf(Uint16Array);
		expect(CombatStats.attackPower).toBeInstanceOf(Float32Array);
		expect(Monster.typeId).toBeInstanceOf(Uint16Array);
		expect(AIState.state).toBeInstanceOf(Uint8Array);
		expect(AutoAttack.active).toBeInstanceOf(Uint8Array);
	});
});

describe("Combat Component Queries", () => {
	test("query alive entities excludes dead", async () => {
		const world = createWorld();
		const { Not } = await import("bitecs");
		const aliveQuery = defineQuery([Health, Not(Dead)]);

		const alive = addEntity(world);
		addComponent(world, Health, alive);
		Health.current[alive] = 100;

		const dead = addEntity(world);
		addComponent(world, Health, dead);
		addComponent(world, Dead, dead);
		Health.current[dead] = 0;

		const result = aliveQuery(world);
		expect(result).toContain(alive);
		expect(result).not.toContain(dead);
	});

	test("query monsters specifically", () => {
		const world = createWorld();
		const monsterQuery = defineQuery([Monster, Health]);

		const monster = addEntity(world);
		addComponent(world, Monster, monster);
		addComponent(world, Health, monster);
		Monster.typeId[monster] = 1;

		const player = addEntity(world);
		addComponent(world, Health, player);
		// player does not have Monster component

		const result = monsterQuery(world);
		expect(result).toContain(monster);
		expect(result).not.toContain(player);
	});
});
