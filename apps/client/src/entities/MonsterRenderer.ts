import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { type HumanoidMesh, buildHumanoidMesh } from "./meshes/HumanoidMeshBuilder.js";
import { HumanoidAnimator, QuadrupedAnimator } from "./meshes/ProceduralAnimator.js";
import {
	type QuadrupedMesh,
	buildQuadrupedMesh,
	typeIdToShape,
} from "./meshes/QuadrupedMeshBuilder.js";

export class MonsterRenderer {
	/** First mesh in allMeshes — used for picking/metadata/rendering queries. */
	get mesh(): Mesh {
		return this.allMeshes[0];
	}

	/** Root transform node — use for world position/rotation. */
	get rootNode(): TransformNode {
		return this.root;
	}

	readonly netId: number;
	private readonly root: TransformNode;
	private readonly allMeshes: Mesh[];
	private readonly material: StandardMaterial;
	private readonly humanoidAnimator: HumanoidAnimator | null;
	private readonly quadrupedAnimator: QuadrupedAnimator | null;
	private readonly joints: HumanoidMesh["joints"] | QuadrupedMesh["joints"];
	private readonly isHumanoid: boolean;
	private prevX = 0;
	private prevZ = 0;

	constructor(
		scene: Scene,
		shadowGenerator: ShadowGenerator,
		options: {
			netId: number;
			name: string;
			color: [number, number, number];
			scale: number;
			typeId: number;
		},
	) {
		this.netId = options.netId;

		const shapeType = typeIdToShape(options.typeId);
		this.isHumanoid = shapeType === "humanoid";

		const color = new Color3(options.color[0], options.color[1], options.color[2]);

		if (this.isHumanoid) {
			const h = buildHumanoidMesh({
				name: `mob_${options.netId}`,
				color,
				scene,
				netId: options.netId,
				entityType: "monster",
			});
			this.root = h.root;
			this.allMeshes = h.allMeshes;
			this.material = h.material;
			this.joints = h.joints;
			this.humanoidAnimator = new HumanoidAnimator();
			this.quadrupedAnimator = null;
			// Apply scale
			this.root.scaling.setAll(options.scale);
		} else {
			const q = buildQuadrupedMesh({
				name: `mob_${options.netId}`,
				shape: shapeType as Exclude<typeof shapeType, "humanoid">,
				color,
				scale: options.scale,
				scene,
				netId: options.netId,
			});
			this.root = q.root;
			this.allMeshes = q.allMeshes;
			this.material = q.material;
			this.joints = q.joints;
			this.humanoidAnimator = null;
			this.quadrupedAnimator = new QuadrupedAnimator();
		}

		// Add shadow casters
		for (const m of this.allMeshes) {
			shadowGenerator.addShadowCaster(m);
		}
	}

	setPosition(x: number, y: number, z: number): void {
		this.root.position.x = x;
		this.root.position.y = y;
		this.root.position.z = z;
	}

	setRotationY(rad: number): void {
		this.root.rotation.y = rad;
	}

	update(dt: number): void {
		const dx = this.root.position.x - this.prevX;
		const dz = this.root.position.z - this.prevZ;
		const isMoving = dx * dx + dz * dz > 0.0001;
		this.prevX = this.root.position.x;
		this.prevZ = this.root.position.z;

		if (this.isHumanoid && this.humanoidAnimator) {
			this.humanoidAnimator.update(dt, isMoving, this.joints as HumanoidMesh["joints"]);
		} else if (this.quadrupedAnimator) {
			this.quadrupedAnimator.update(dt, isMoving, this.joints as QuadrupedMesh["joints"]);
		}
	}

	/** Set visibility on all meshes (e.g. 0.4 when dead). */
	setVisibility(v: number): void {
		for (const m of this.allMeshes) {
			m.visibility = v;
		}
	}

	flashHit(): void {
		const original = this.material.diffuseColor.clone();
		this.material.diffuseColor = new Color3(1, 1, 1);
		setTimeout(() => {
			this.material.diffuseColor = original;
		}, 100);
	}

	dispose(): void {
		this.root.dispose(false, true);
	}
}
