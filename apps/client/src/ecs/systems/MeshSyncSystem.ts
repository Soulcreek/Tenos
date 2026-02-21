import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import { Position, RemotePlayer, Rotation } from "@tenos/shared";
import { defineQuery, enterQuery, exitQuery } from "bitecs";
import type { IWorld } from "bitecs";
import { CharacterRenderer } from "../../entities/CharacterRenderer.js";

const LERP_FACTOR = 0.15;

const remoteQuery = defineQuery([RemotePlayer, Position, Rotation]);
const remoteEnter = enterQuery(remoteQuery);
const remoteExit = exitQuery(remoteQuery);

/**
 * Syncs ECS entities to Babylon.js meshes.
 *
 * - Creates CharacterRenderer meshes for new remote entities
 * - Disposes meshes for removed entities
 * - Lerps remote entity mesh positions for smooth movement
 */
export function createMeshSyncSystem(
	scene: Scene,
	shadowGenerator: ShadowGenerator,
	eidToNetId?: Map<number, number>,
) {
	const meshes = new Map<number, CharacterRenderer>();
	let nextColorIdx = 0;
	const colors = [
		new Color3(0.8, 0.2, 0.2), // red
		new Color3(0.2, 0.8, 0.2), // green
		new Color3(0.8, 0.6, 0.1), // gold
		new Color3(0.6, 0.2, 0.8), // purple
		new Color3(0.2, 0.7, 0.7), // teal
	];

	return function meshSyncSystem(world: IWorld): void {
		// Handle newly added remote entities
		const entered = remoteEnter(world);
		for (let i = 0; i < entered.length; i++) {
			const eid = entered[i];
			const color = colors[nextColorIdx % colors.length];
			nextColorIdx++;

			const netId = eidToNetId?.get(eid) ?? 0;
			const renderer = new CharacterRenderer(scene, shadowGenerator, {
				name: `remote_${eid}`,
				color,
				netId,
			});
			meshes.set(eid, renderer);
		}

		// Handle removed remote entities
		const exited = remoteExit(world);
		for (let i = 0; i < exited.length; i++) {
			const eid = exited[i];
			const renderer = meshes.get(eid);
			if (renderer) {
				renderer.dispose();
				meshes.delete(eid);
			}
		}

		// Lerp existing remote meshes toward ECS positions
		const entities = remoteQuery(world);
		for (let i = 0; i < entities.length; i++) {
			const eid = entities[i];
			const renderer = meshes.get(eid);
			if (!renderer) continue;

			const targetX = Position.x[eid];
			const targetY = Position.y[eid];
			const targetZ = Position.z[eid];

			// Lerp for smooth interpolation
			const mesh = renderer.mesh;
			mesh.position.x += (targetX - mesh.position.x) * LERP_FACTOR;
			mesh.position.y += (targetY + 0.6 - mesh.position.y) * LERP_FACTOR;
			mesh.position.z += (targetZ - mesh.position.z) * LERP_FACTOR;

			// Rotation (snap, not lerped — simpler for now)
			renderer.setRotationY(Rotation.y[eid]);
		}
	};
}
