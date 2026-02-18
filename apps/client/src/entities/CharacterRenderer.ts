import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Creates a placeholder character mesh (capsule shape).
 * Will be replaced with actual GLTF models in a later milestone.
 */
export class CharacterRenderer {
	readonly mesh: Mesh;

	constructor(
		scene: Scene,
		shadowGenerator: ShadowGenerator,
		options: { name: string; color?: Color3; position?: Vector3 } = { name: "player" },
	) {
		// Capsule body (cylinder + two half-spheres)
		const body = MeshBuilder.CreateCylinder(
			`${options.name}_body`,
			{ height: 1.2, diameter: 0.6, tessellation: 16 },
			scene,
		);

		const head = MeshBuilder.CreateSphere(
			`${options.name}_head`,
			{ diameter: 0.55, segments: 12 },
			scene,
		);
		head.position.y = 0.85;
		head.parent = body;

		// Material
		const mat = new StandardMaterial(`${options.name}_mat`, scene);
		mat.diffuseColor = options.color ?? new Color3(0.2, 0.4, 0.8);
		mat.specularColor = new Color3(0.3, 0.3, 0.3);
		body.material = mat;
		head.material = mat;

		// Position on terrain
		const pos = options.position ?? new Vector3(0, 0.6, 0);
		body.position = pos;

		// Cast shadow
		shadowGenerator.addShadowCaster(body);
		shadowGenerator.addShadowCaster(head);

		this.mesh = body;
	}

	/** Updates the mesh world position (called from MeshSyncSystem later). */
	setPosition(x: number, y: number, z: number): void {
		this.mesh.position.x = x;
		this.mesh.position.y = y + 0.6; // offset so feet are at ground level
		this.mesh.position.z = z;
	}

	/** Sets facing direction as Y-axis rotation in radians. */
	setRotationY(rad: number): void {
		this.mesh.rotation.y = rad;
	}

	dispose(): void {
		this.mesh.dispose(false, true);
	}
}
