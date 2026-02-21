import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Creates a placeholder monster mesh (capsule shape with type-specific color/size).
 */
export class MonsterRenderer {
	readonly mesh: Mesh;
	readonly netId: number;

	constructor(
		scene: Scene,
		shadowGenerator: ShadowGenerator,
		options: {
			netId: number;
			name: string;
			color: [number, number, number];
			scale: number;
		},
	) {
		this.netId = options.netId;

		const scale = options.scale;
		const body = MeshBuilder.CreateCylinder(
			`mob_${options.netId}_body`,
			{ height: 1.2 * scale, diameter: 0.6 * scale, tessellation: 16 },
			scene,
		);

		const head = MeshBuilder.CreateSphere(
			`mob_${options.netId}_head`,
			{ diameter: 0.55 * scale, segments: 12 },
			scene,
		);
		head.position.y = 0.85 * scale;
		head.parent = body;

		// Material
		const mat = new StandardMaterial(`mob_${options.netId}_mat`, scene);
		mat.diffuseColor = new Color3(options.color[0], options.color[1], options.color[2]);
		mat.specularColor = new Color3(0.3, 0.3, 0.3);
		body.material = mat;
		head.material = mat;

		// Set metadata for picking
		body.metadata = { netId: options.netId, entityType: "monster" };
		head.metadata = { netId: options.netId, entityType: "monster" };

		// Cast shadow
		shadowGenerator.addShadowCaster(body);
		shadowGenerator.addShadowCaster(head);

		// Position offset so feet are on the ground
		body.position.y = 0.6 * scale;

		this.mesh = body;
	}

	setPosition(x: number, y: number, z: number): void {
		this.mesh.position.x = x;
		this.mesh.position.y = y + 0.6;
		this.mesh.position.z = z;
	}

	setRotationY(rad: number): void {
		this.mesh.rotation.y = rad;
	}

	/** Flash red on hit. */
	flashHit(): void {
		const mat = this.mesh.material as StandardMaterial;
		if (!mat) return;
		const original = mat.diffuseColor.clone();
		mat.diffuseColor = new Color3(1, 1, 1);
		setTimeout(() => {
			mat.diffuseColor = original;
		}, 100);
	}

	dispose(): void {
		this.mesh.dispose(false, true);
	}
}
