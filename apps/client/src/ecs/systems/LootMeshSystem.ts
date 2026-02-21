import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { RemoteLootData } from "../../network/NetworkManager.js";

const HOVER_SPEED = 2.0;
const HOVER_AMPLITUDE = 0.15;

interface LootMeshEntry {
	mesh: Mesh;
	baseY: number;
	netId: number;
}

/**
 * Manages visual meshes for loot drops on the ground.
 * Creates small glowing boxes that float and rotate.
 */
export function createLootMeshSystem(scene: Scene) {
	const lootMeshes = new Map<number, LootMeshEntry>();
	let time = 0;

	// Shared material for loot items
	const lootMat = new StandardMaterial("loot_mat", scene);
	lootMat.diffuseColor = new Color3(1.0, 0.85, 0.2);
	lootMat.emissiveColor = new Color3(0.4, 0.35, 0.05);
	lootMat.specularColor = new Color3(1, 1, 1);

	return {
		/** Add a loot mesh when it appears via schema sync. */
		addLoot(data: RemoteLootData): void {
			if (lootMeshes.has(data.netId)) return;

			const mesh = MeshBuilder.CreateBox(
				`loot_${data.netId}`,
				{ width: 0.3, height: 0.3, depth: 0.3 },
				scene,
			);
			mesh.material = lootMat;
			mesh.position.x = data.x;
			mesh.position.y = 0.4;
			mesh.position.z = data.z;

			// Set metadata for picking
			mesh.metadata = { netId: data.netId, entityType: "loot" };

			lootMeshes.set(data.netId, { mesh, baseY: 0.4, netId: data.netId });
		},

		/** Remove a loot mesh. */
		removeLoot(netId: number): void {
			const entry = lootMeshes.get(netId);
			if (entry) {
				entry.mesh.dispose();
				lootMeshes.delete(netId);
			}
		},

		/** Remove loot by schema key (e.g. "loot_123"). */
		removeLootByKey(key: string): void {
			// Extract netId from key like "loot_123"
			const parts = key.split("_");
			const netId = Number.parseInt(parts[1], 10);
			if (!Number.isNaN(netId)) {
				this.removeLoot(netId);
			}
		},

		/** Called every frame — animate hover and rotation. */
		update(dt: number): void {
			time += dt;
			for (const [, entry] of lootMeshes) {
				entry.mesh.position.y = entry.baseY + Math.sin(time * HOVER_SPEED) * HOVER_AMPLITUDE;
				entry.mesh.rotation.y += dt * 1.5;
			}
		},
	};
}
