import { describe, expect, test } from "bun:test";
import { addComponent, addEntity } from "bitecs";
import { Position, Rotation, Velocity } from "../components/core.js";
import { createWorld } from "../world.js";
import { movementSystem } from "./MovementSystem.js";

describe("MovementSystem", () => {
	test("applies velocity to position", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		Position.x[eid] = 0;
		Position.z[eid] = 0;
		Velocity.x[eid] = 5;
		Velocity.z[eid] = 3;

		movementSystem(world, 1.0);

		expect(Position.x[eid]).toBeCloseTo(5.0, 4);
		expect(Position.z[eid]).toBeCloseTo(3.0, 4);
	});

	test("is frame-rate independent (dt scaling)", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		Velocity.x[eid] = 10;

		// 2 half-second ticks should equal 1 full-second tick
		movementSystem(world, 0.5);
		movementSystem(world, 0.5);

		expect(Position.x[eid]).toBeCloseTo(10.0, 4);
	});

	test("updates rotation to face movement direction", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		// Moving along +X → atan2(vx, vz) = atan2(5, 0) = PI/2
		Velocity.x[eid] = 5;
		Velocity.z[eid] = 0;

		movementSystem(world, 0.1);

		expect(Rotation.y[eid]).toBeCloseTo(Math.PI / 2, 4);
	});

	test("does not update rotation when stationary", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		Rotation.y[eid] = 1.5; // some previous facing
		Velocity.x[eid] = 0;
		Velocity.z[eid] = 0;

		movementSystem(world, 1.0);

		expect(Rotation.y[eid]).toBeCloseTo(1.5, 4);
	});

	test("handles multiple entities", () => {
		const world = createWorld();

		const e1 = addEntity(world);
		addComponent(world, Position, e1);
		addComponent(world, Velocity, e1);
		addComponent(world, Rotation, e1);
		Velocity.x[e1] = 1;

		const e2 = addEntity(world);
		addComponent(world, Position, e2);
		addComponent(world, Velocity, e2);
		addComponent(world, Rotation, e2);
		Velocity.z[e2] = -2;

		movementSystem(world, 1.0);

		expect(Position.x[e1]).toBeCloseTo(1.0, 4);
		expect(Position.z[e2]).toBeCloseTo(-2.0, 4);
	});

	test("applies Y velocity (gravity/jump)", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		Position.y[eid] = 10;
		Velocity.y[eid] = -9.81;

		movementSystem(world, 0.5);

		expect(Position.y[eid]).toBeCloseTo(10 + -9.81 * 0.5, 2);
	});

	test("configurable speed via velocity magnitude", () => {
		const world = createWorld();
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Velocity, eid);
		addComponent(world, Rotation, eid);

		// 5 units/second along Z (base move speed)
		Velocity.z[eid] = 5;

		movementSystem(world, 1.0);

		expect(Position.z[eid]).toBeCloseTo(5.0, 4);
	});
});
