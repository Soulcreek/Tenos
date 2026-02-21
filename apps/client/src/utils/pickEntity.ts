import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";

export interface PickResult {
	netId: number;
	entityType: string;
}

/**
 * Pick an entity from a screen-space click by ray-casting into the scene.
 * Walks up the mesh hierarchy looking for metadata.netId and metadata.entityType.
 * Returns { netId, entityType } if found, or { netId: 0, entityType: "" } if nothing was hit.
 */
export function pickEntity(scene: Scene, x: number, y: number): number {
	const pick = scene.pick(x, y);
	if (!pick?.hit || !pick.pickedMesh) return 0;

	return getNetIdFromMesh(pick.pickedMesh);
}

/**
 * Pick an entity with full metadata (netId + entityType).
 */
export function pickEntityFull(scene: Scene, x: number, y: number): PickResult {
	const pick = scene.pick(x, y);
	if (!pick?.hit || !pick.pickedMesh) return { netId: 0, entityType: "" };

	return getMetaFromMesh(pick.pickedMesh);
}

/** Walk up mesh hierarchy to find netId in metadata. */
export function getNetIdFromMesh(mesh: AbstractMesh | null): number {
	let current = mesh;
	while (current) {
		const meta = current.metadata;
		if (meta) {
			if (typeof meta.netId === "number" && meta.netId > 0) return meta.netId;
		}
		current = current.parent as AbstractMesh | null;
	}
	return 0;
}

/** Walk up mesh hierarchy to find netId + entityType in metadata. */
function getMetaFromMesh(mesh: AbstractMesh | null): PickResult {
	let current = mesh;
	while (current) {
		const meta = current.metadata;
		if (meta && typeof meta.netId === "number" && meta.netId > 0) {
			return { netId: meta.netId, entityType: (meta.entityType as string) ?? "" };
		}
		current = current.parent as AbstractMesh | null;
	}
	return { netId: 0, entityType: "" };
}
