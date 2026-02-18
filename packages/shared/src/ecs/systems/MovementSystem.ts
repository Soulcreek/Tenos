import { defineQuery } from "bitecs";
import type { IWorld } from "bitecs";
import { Position, Rotation, Velocity } from "../components/core.js";

const movableQuery = defineQuery([Position, Velocity]);

/**
 * Shared movement system — runs on both client (prediction) and server (authoritative).
 *
 * Applies velocity to position each tick. Frame-rate independent via `dt`.
 * Zero-allocation: no objects created per tick, only TypedArray reads/writes.
 *
 * @param world - BitECS world
 * @param dt    - Delta time in seconds
 */
export function movementSystem(world: IWorld, dt: number): void {
	const entities = movableQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];

		Position.x[eid] += Velocity.x[eid] * dt;
		Position.y[eid] += Velocity.y[eid] * dt;
		Position.z[eid] += Velocity.z[eid] * dt;

		// Update facing direction when moving horizontally
		const vx = Velocity.x[eid];
		const vz = Velocity.z[eid];
		if (vx !== 0 || vz !== 0) {
			Rotation.y[eid] = Math.atan2(vx, vz);
		}
	}
}
