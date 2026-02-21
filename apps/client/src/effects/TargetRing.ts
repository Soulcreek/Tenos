import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Red torus rendered under the currently targeted entity.
 */
export class TargetRing {
	private ring: Mesh;

	constructor(scene: Scene) {
		this.ring = MeshBuilder.CreateTorus(
			"targetRing",
			{ diameter: 1.4, thickness: 0.08, tessellation: 32 },
			scene,
		);
		const mat = new StandardMaterial("targetRingMat", scene);
		mat.diffuseColor = new Color3(1, 0.1, 0.1);
		mat.emissiveColor = new Color3(0.8, 0, 0);
		mat.alpha = 0.7;
		this.ring.material = mat;
		this.ring.isPickable = false;
		this.ring.setEnabled(false);
	}

	/** Attach ring under a target mesh. */
	show(targetMesh: AbstractMesh): void {
		this.ring.setEnabled(true);
		const absPos = targetMesh.getAbsolutePosition();
		this.ring.position.x = absPos.x;
		this.ring.position.z = absPos.z;
		this.ring.position.y = 0.05; // just above ground
	}

	/** Update ring position to follow a moving target. */
	update(targetMesh: AbstractMesh): void {
		if (!this.ring.isEnabled()) return;
		const absPos = targetMesh.getAbsolutePosition();
		this.ring.position.x = absPos.x;
		this.ring.position.z = absPos.z;
		this.ring.position.y = 0.05;
	}

	hide(): void {
		this.ring.setEnabled(false);
	}

	dispose(): void {
		this.ring.dispose();
	}
}
