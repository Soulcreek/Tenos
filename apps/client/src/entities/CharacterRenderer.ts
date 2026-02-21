import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { type HumanoidMesh, buildHumanoidMesh } from "./meshes/HumanoidMeshBuilder.js";
import { HumanoidAnimator } from "./meshes/ProceduralAnimator.js";

export class CharacterRenderer {
	/** First child mesh — used for picking/metadata/rendering queries. */
	get mesh() {
		return this.humanoid.allMeshes[0];
	}

	/** Root transform node — use for world position/rotation. */
	get rootNode() {
		return this.humanoid.root;
	}

	private readonly humanoid: HumanoidMesh;
	private readonly animator: HumanoidAnimator;
	private prevX = 0;
	private prevZ = 0;

	constructor(
		scene: Scene,
		shadowGenerator: ShadowGenerator,
		options: { name: string; color?: Color3; position?: Vector3; netId?: number } = {
			name: "player",
		},
	) {
		this.humanoid = buildHumanoidMesh({
			name: options.name,
			color: options.color ?? new Color3(0.2, 0.4, 0.8),
			scene,
			netId: options.netId,
			entityType: "player",
		});

		this.animator = new HumanoidAnimator();

		// Position on terrain
		const pos = options.position ?? new Vector3(0, 0, 0);
		this.humanoid.root.position = pos;

		// Add shadow casters for visible body parts
		for (const m of this.humanoid.allMeshes) {
			shadowGenerator.addShadowCaster(m);
		}
	}

	setPosition(x: number, y: number, z: number): void {
		this.humanoid.root.position.x = x;
		this.humanoid.root.position.y = y;
		this.humanoid.root.position.z = z;
	}

	setRotationY(rad: number): void {
		this.humanoid.root.rotation.y = rad;
	}

	/** Call each frame to drive procedural animation. */
	update(dt: number): void {
		const dx = this.humanoid.root.position.x - this.prevX;
		const dz = this.humanoid.root.position.z - this.prevZ;
		const isMoving = dx * dx + dz * dz > 0.0001;
		this.prevX = this.humanoid.root.position.x;
		this.prevZ = this.humanoid.root.position.z;

		this.animator.update(dt, isMoving, this.humanoid.joints);
	}

	flashHit(): void {
		const mat = this.humanoid.material;
		const original = mat.diffuseColor.clone();
		mat.diffuseColor = new Color3(1, 1, 1);
		setTimeout(() => {
			mat.diffuseColor = original;
		}, 100);
	}

	triggerLunge(): void {
		this.animator.triggerAttack();
	}

	dispose(): void {
		this.humanoid.root.dispose(false, true);
	}
}
