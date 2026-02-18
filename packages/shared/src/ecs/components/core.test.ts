import { describe, expect, test } from "bun:test";
import { addComponent, addEntity, defineQuery, hasComponent, removeEntity } from "bitecs";
import { createWorld } from "../world.js";
import {
	LocalPlayer,
	MeshRef,
	NetworkIdentity,
	Position,
	RemotePlayer,
	Rotation,
	Velocity,
} from "./core.js";

describe("ECS World", () => {
	test("createWorld returns a valid world", () => {
		const world = createWorld();
		expect(world).toBeDefined();
	});

	test("can create entities in the world", () => {
		const world = createWorld();
		const eid = addEntity(world);
		expect(eid).toBeGreaterThanOrEqual(0);
	});

	test("entity IDs are sequential", () => {
		const world = createWorld();
		const a = addEntity(world);
		const b = addEntity(world);
		expect(b).toBe(a + 1);
	});
});

describe("Core Components", () => {
	test("Position component stores f32 values", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);

		Position.x[eid] = 10.5;
		Position.y[eid] = 20.0;
		Position.z[eid] = -5.25;

		expect(Position.x[eid]).toBeCloseTo(10.5, 2);
		expect(Position.y[eid]).toBeCloseTo(20.0, 2);
		expect(Position.z[eid]).toBeCloseTo(-5.25, 2);
	});

	test("Velocity component stores f32 values", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Velocity, eid);

		Velocity.x[eid] = 1.5;
		Velocity.y[eid] = -9.81;
		Velocity.z[eid] = 0.0;

		expect(Velocity.x[eid]).toBeCloseTo(1.5, 2);
		expect(Velocity.y[eid]).toBeCloseTo(-9.81, 2);
		expect(Velocity.z[eid]).toBeCloseTo(0.0, 2);
	});

	test("Rotation component stores Y-axis rotation", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Rotation, eid);

		Rotation.y[eid] = Math.PI / 4;

		expect(Rotation.y[eid]).toBeCloseTo(Math.PI / 4, 4);
	});

	test("NetworkIdentity stores ui32 IDs", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, NetworkIdentity, eid);

		NetworkIdentity.netId[eid] = 42;
		NetworkIdentity.ownerId[eid] = 1001;

		expect(NetworkIdentity.netId[eid]).toBe(42);
		expect(NetworkIdentity.ownerId[eid]).toBe(1001);
	});

	test("MeshRef stores mesh ID", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, MeshRef, eid);

		MeshRef.meshId[eid] = 7;

		expect(MeshRef.meshId[eid]).toBe(7);
	});

	test("tag components (LocalPlayer, RemotePlayer) have no data", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, LocalPlayer, eid);

		expect(hasComponent(world, LocalPlayer, eid)).toBe(true);
		expect(hasComponent(world, RemotePlayer, eid)).toBe(false);
	});

	test("components are backed by TypedArrays", () => {
		expect(Position.x).toBeInstanceOf(Float32Array);
		expect(Position.y).toBeInstanceOf(Float32Array);
		expect(Position.z).toBeInstanceOf(Float32Array);
		expect(Velocity.x).toBeInstanceOf(Float32Array);
		expect(NetworkIdentity.netId).toBeInstanceOf(Uint32Array);
		expect(NetworkIdentity.ownerId).toBeInstanceOf(Uint32Array);
	});
});

describe("ECS Queries", () => {
	test("query returns entities with matching components", () => {
		const world = createWorld();

		const movable = defineQuery([Position, Velocity]);

		const e1 = addEntity(world);
		addComponent(world, Position, e1);
		addComponent(world, Velocity, e1);

		const e2 = addEntity(world);
		addComponent(world, Position, e2);
		// e2 has no Velocity

		const e3 = addEntity(world);
		addComponent(world, Position, e3);
		addComponent(world, Velocity, e3);

		const result = movable(world);
		expect(result).toContain(e1);
		expect(result).not.toContain(e2);
		expect(result).toContain(e3);
	});

	test("query updates when entities are removed", () => {
		const world = createWorld();
		const movable = defineQuery([Position, Velocity]);

		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);

		expect(movable(world)).toContain(eid);

		removeEntity(world, eid);

		expect(movable(world)).not.toContain(eid);
	});

	test("networked query finds entities with NetworkIdentity", () => {
		const world = createWorld();
		const networked = defineQuery([Position, NetworkIdentity]);

		const local = addEntity(world);
		addComponent(world, Position, local);

		const remote = addEntity(world);
		addComponent(world, Position, remote);
		addComponent(world, NetworkIdentity, remote);
		NetworkIdentity.netId[remote] = 1;

		const result = networked(world);
		expect(result).not.toContain(local);
		expect(result).toContain(remote);
	});

	test("LocalPlayer vs RemotePlayer query separation", () => {
		const world = createWorld();
		const localQuery = defineQuery([Position, LocalPlayer]);
		const remoteQuery = defineQuery([Position, RemotePlayer]);

		const me = addEntity(world);
		addComponent(world, Position, me);
		addComponent(world, LocalPlayer, me);

		const other = addEntity(world);
		addComponent(world, Position, other);
		addComponent(world, RemotePlayer, other);

		expect(localQuery(world)).toContain(me);
		expect(localQuery(world)).not.toContain(other);
		expect(remoteQuery(world)).toContain(other);
		expect(remoteQuery(world)).not.toContain(me);
	});
});
