import type { Engine } from "@babylonjs/core/Engines/engine";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { CharacterRenderer } from "../entities/CharacterRenderer.js";
import { TerrainManager } from "../terrain/TerrainManager.js";

// Side-effect imports required for tree-shaking
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Particles/particleSystemComponent";

// Pre-import shaders to avoid dynamic import failures in production
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/color.vertex";
import "@babylonjs/core/Shaders/color.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";
import "@babylonjs/core/Shaders/depth.vertex";
import "@babylonjs/core/Shaders/depth.fragment";
import "@babylonjs/core/Shaders/particles.vertex";
import "@babylonjs/core/Shaders/particles.fragment";

export interface SceneContext {
	scene: Scene;
	sunLight: DirectionalLight;
	shadowGenerator: ShadowGenerator;
	terrain: TerrainManager;
	localCharacter: CharacterRenderer;
}

/**
 * Creates the game scene: lighting, terrain, character.
 */
export async function createScene(engine: Engine): Promise<SceneContext> {
	const scene = new Scene(engine);
	scene.clearColor = new Color4(0.53, 0.72, 0.9, 1.0);

	// ── Ambient Light ──────────────────────────────────────────
	const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
	ambient.intensity = 0.4;
	ambient.groundColor = new Color3(0.2, 0.2, 0.25);

	// ── Directional Sun Light (shadows) ────────────────────────
	const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.5).normalize(), scene);
	sun.intensity = 0.8;
	sun.position = new Vector3(50, 100, -50);

	// ── Shadow Generator ───────────────────────────────────────
	const shadowGenerator = new ShadowGenerator(1024, sun);
	shadowGenerator.useExponentialShadowMap = true;

	// ── Terrain (ground + skybox) ──────────────────────────────
	const terrain = new TerrainManager(scene, shadowGenerator);

	// ── Local Player Character ─────────────────────────────────
	const localCharacter = new CharacterRenderer(scene, shadowGenerator, {
		name: "localPlayer",
		color: new Color3(0.2, 0.4, 0.8),
	});

	// ── Fog ────────────────────────────────────────────────────
	scene.fogMode = Scene.FOGMODE_EXP2;
	scene.fogColor = new Color3(0.53, 0.72, 0.9);
	scene.fogDensity = 0.003;

	return { scene, sunLight: sun, shadowGenerator, terrain, localCharacter };
}
