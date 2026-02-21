import type { ArcRotateCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { Scene } from "@babylonjs/core/scene";
import HavokPhysics from "@babylonjs/havok";
import { CharacterRenderer } from "../entities/CharacterRenderer.js";
import { TerrainManager } from "../terrain/TerrainManager.js";

// Side-effect imports required for tree-shaking
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Particles/particleSystemComponent";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";

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
import "@babylonjs/core/Shaders/kernelBlur.vertex";
import "@babylonjs/core/Shaders/kernelBlur.fragment";
import "@babylonjs/core/Shaders/depthBoxBlur.fragment";
import "@babylonjs/core/Shaders/pass.fragment";
import "@babylonjs/core/Shaders/postprocess.vertex";

export interface SceneContext {
	scene: Scene;
	camera: ArcRotateCamera;
	sunLight: DirectionalLight;
	shadowGenerator: ShadowGenerator;
	terrain: TerrainManager;
	localCharacter: CharacterRenderer;
}

/**
 * Creates the game scene: physics, lighting, terrain, character, camera.
 */
export async function createScene(engine: Engine): Promise<SceneContext> {
	const scene = new Scene(engine);
	scene.clearColor = new Color4(0.53, 0.72, 0.9, 1.0);

	// ── Havok Physics ──────────────────────────────────────────
	const havokInstance = await HavokPhysics({
		locateFile: () => "/HavokPhysics.wasm",
	});
	scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havokInstance));

	// ── Ambient Light ──────────────────────────────────────────
	const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
	ambient.intensity = 0.4;
	ambient.groundColor = new Color3(0.2, 0.2, 0.25);

	// ── Directional Sun Light (shadows) ────────────────────────
	const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.5).normalize(), scene);
	sun.intensity = 0.8;
	sun.position = new Vector3(50, 100, -50);

	// ── Shadow Generator ───────────────────────────────────────
	const shadowGenerator = new ShadowGenerator(2048, sun);
	shadowGenerator.useBlurExponentialShadowMap = true;
	shadowGenerator.blurKernel = 16;

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

	// ── Camera (ArcRotate, Metin2-style) ───────────────────────
	// Temporary setup — replaced by GameCamera in TASK-006
	const camera = new ArcRotateCamera(
		"camera",
		-Math.PI / 2, // alpha: behind character
		0.8, // beta: ~45° elevation
		12, // radius: default zoom
		localCharacter.mesh.position,
		scene,
	);
	camera.lowerRadiusLimit = 3;
	camera.upperRadiusLimit = 25;
	camera.lowerBetaLimit = 0.3;
	camera.upperBetaLimit = 1.4;
	camera.wheelDeltaPercentage = 0.02;
	const canvas = engine.getRenderingCanvas();
	if (canvas) camera.attachControl(canvas, true);

	// Right-click only for camera rotation (left-click reserved for targeting)
	const pointers = camera.inputs.attached.pointers as ArcRotateCameraPointersInput;
	pointers.buttons = [2];

	return { scene, camera, sunLight: sun, shadowGenerator, terrain, localCharacter };
}
