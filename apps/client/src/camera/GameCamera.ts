import type { ArcRotateCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

// Camera collision ray
import "@babylonjs/core/Collisions/collisionCoordinator";

/** Camera parameters per ADR-001 */
const MIN_RADIUS = 3;
const MAX_RADIUS = 25;
const DEFAULT_RADIUS = 12;
const MIN_BETA = 0.3; // ~17° (near-horizontal)
const MAX_BETA = 1.4; // ~80° (near top-down)
const DEFAULT_BETA = 0.8; // ~45° (Metin2-style)
const DEFAULT_ALPHA = -Math.PI / 2; // behind character
const FOLLOW_LERP = 0.1; // smooth follow factor

/**
 * Metin2-style third-person chase camera.
 *
 * - Right-click drag rotates around character
 * - Scroll wheel zooms
 * - Smoothly follows target mesh via lerped position
 * - Collides with terrain to prevent clipping
 */
export class GameCamera {
	readonly camera: ArcRotateCamera;
	private targetMesh: TransformNode;
	private readonly lerpTarget = Vector3.Zero();

	constructor(scene: Scene, canvas: HTMLCanvasElement, target: TransformNode) {
		this.targetMesh = target;

		this.camera = new ArcRotateCamera(
			"gameCamera",
			DEFAULT_ALPHA,
			DEFAULT_BETA,
			DEFAULT_RADIUS,
			target.position.clone(),
			scene,
		);

		// Radius (zoom) limits
		this.camera.lowerRadiusLimit = MIN_RADIUS;
		this.camera.upperRadiusLimit = MAX_RADIUS;

		// Elevation limits
		this.camera.lowerBetaLimit = MIN_BETA;
		this.camera.upperBetaLimit = MAX_BETA;

		// Zoom sensitivity
		this.camera.wheelDeltaPercentage = 0.02;

		// Attach controls — right-click only for rotation
		this.camera.attachControl(canvas, true);
		const pointers = this.camera.inputs.attached.pointers as ArcRotateCameraPointersInput;
		pointers.buttons = [2];

		// Camera collision to prevent seeing through terrain/walls
		this.camera.checkCollisions = true;
		this.camera.collisionRadius = new Vector3(0.5, 0.5, 0.5);

		// Disable default panning (middle-click)
		this.camera.panningSensibility = 0;
	}

	/**
	 * Update camera target with smooth interpolation.
	 * Call once per frame from the game loop.
	 */
	update(): void {
		const meshPos = this.targetMesh.position;

		// Lerp camera target toward actual mesh position
		Vector3.LerpToRef(this.camera.target, meshPos, FOLLOW_LERP, this.lerpTarget);
		this.camera.target.copyFrom(this.lerpTarget);
	}

	/** Switch which mesh the camera follows (e.g. on zone transfer). */
	setTarget(node: TransformNode): void {
		this.targetMesh = node;
	}

	dispose(): void {
		this.camera.dispose();
	}
}
