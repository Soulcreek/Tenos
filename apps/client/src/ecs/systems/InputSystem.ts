import { LocalPlayer, Position, Velocity } from "@tenos/shared";
import { defineQuery } from "bitecs";
import type { IWorld } from "bitecs";
import type { InputManager } from "../../input/InputManager.js";

/** Movement speed in units/second. */
const MOVE_SPEED = 5.0;

const localPlayerQuery = defineQuery([LocalPlayer, Position, Velocity]);

/**
 * ECS system that reads input from InputManager and writes to
 * the local player's Velocity component.
 *
 * Runs on the client at 60Hz (every render frame).
 */
export function createInputSystem(inputManager: InputManager) {
	return function inputSystem(world: IWorld, _dt: number): void {
		const { x: moveX, z: moveZ } = inputManager.getMovement();

		const entities = localPlayerQuery(world);
		for (let i = 0; i < entities.length; i++) {
			const eid = entities[i];
			Velocity.x[eid] = moveX * MOVE_SPEED;
			Velocity.z[eid] = moveZ * MOVE_SPEED;
		}

		inputManager.resetFrameState();
	};
}
