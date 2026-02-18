import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import type { Scene } from "@babylonjs/core/scene";

export const TERRAIN_SIZE = 128;
const TERRAIN_SUBDIVISIONS = 64;

/**
 * Manages the game terrain: ground plane, skybox, and environment visuals.
 */
export class TerrainManager {
	readonly ground: Mesh;

	constructor(scene: Scene, _shadowGenerator: ShadowGenerator) {
		// ── Ground Plane ───────────────────────────────────────────
		this.ground = MeshBuilder.CreateGround(
			"ground",
			{ width: TERRAIN_SIZE, height: TERRAIN_SIZE, subdivisions: TERRAIN_SUBDIVISIONS },
			scene,
		);

		const groundMat = new StandardMaterial("groundMat", scene);
		groundMat.diffuseTexture = this.createGrassTexture(scene);
		groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
		this.ground.material = groundMat;
		this.ground.receiveShadows = true;

		new PhysicsAggregate(this.ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

		// ── Skybox ─────────────────────────────────────────────────
		this.createSkybox(scene);
	}

	/**
	 * Procedural grass texture (avoids external asset dependency for now).
	 * Generates a 512x512 canvas with randomized green tones.
	 */
	private createGrassTexture(scene: Scene): DynamicTexture {
		const size = 512;
		const tex = new DynamicTexture("grassTex", size, scene, true);
		const ctx = tex.getContext();

		// Base green fill
		ctx.fillStyle = "#3a6b1e";
		ctx.fillRect(0, 0, size, size);

		// Randomized grass patches for visual variety
		const rng = mulberry32(42); // deterministic seed
		for (let i = 0; i < 6000; i++) {
			const x = Math.floor(rng() * size);
			const y = Math.floor(rng() * size);
			const g = 80 + Math.floor(rng() * 60);
			const r = 30 + Math.floor(rng() * 30);
			ctx.fillStyle = `rgb(${r},${g},20)`;
			ctx.fillRect(x, y, 2, 2);
		}

		// Subtle dark patches (soil showing through)
		for (let i = 0; i < 300; i++) {
			const x = Math.floor(rng() * size);
			const y = Math.floor(rng() * size);
			const w = 3 + Math.floor(rng() * 6);
			ctx.fillStyle = "rgba(40,30,15,0.3)";
			ctx.fillRect(x, y, w, w);
		}

		tex.update();
		tex.uScale = 16;
		tex.vScale = 16;
		return tex;
	}

	/**
	 * Creates a procedural skybox using a solid-color CubeTexture substitute.
	 * We build a large inverted box with a gradient-like sky material.
	 */
	private createSkybox(scene: Scene): void {
		const skybox = MeshBuilder.CreateBox("skybox", { size: 500 }, scene);
		const skyMat = new StandardMaterial("skyMat", scene);
		skyMat.backFaceCulling = false;
		skyMat.disableLighting = true;

		// Procedural sky color texture
		const tex = new DynamicTexture("skyTex", 256, scene, false);
		const ctx = tex.getContext();
		const gradient = ctx.createLinearGradient(0, 0, 0, 256);
		gradient.addColorStop(0, "#1a3a6b"); // zenith (deep blue)
		gradient.addColorStop(0.4, "#4a8bcc"); // mid-sky
		gradient.addColorStop(0.7, "#87ceeb"); // horizon blue
		gradient.addColorStop(1.0, "#c9dfe8"); // near-horizon haze
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 256, 256);
		tex.update();

		skyMat.emissiveTexture = tex;
		skyMat.diffuseColor = new Color3(0, 0, 0);
		skybox.material = skyMat;
		skybox.infiniteDistance = true;
		skybox.renderingGroupId = 0;
	}
}

/** Simple deterministic PRNG (Mulberry32) for reproducible grass texture. */
function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
