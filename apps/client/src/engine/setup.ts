import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { Scene } from "@babylonjs/core/scene";
import HavokPhysics from "@babylonjs/havok";

export async function initEngine(canvas: HTMLCanvasElement) {
	// Initialize Babylon.js engine
	const engine = new Engine(canvas, true, {
		preserveDrawingBuffer: true,
		stencil: true,
	});

	const scene = new Scene(engine);

	// Initialize Havok physics
	const havokInstance = await HavokPhysics({
		locateFile: () => "/HavokPhysics.wasm",
	});
	const havokPlugin = new HavokPlugin(true, havokInstance);
	scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

	// Camera
	const camera = new FreeCamera("camera", new Vector3(0, 5, -10), scene);
	camera.setTarget(Vector3.Zero());
	camera.attachControl(canvas, true);

	// Light
	new HemisphericLight("light", new Vector3(0, 1, 0), scene);

	// Ground
	const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
	new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

	// Test cube (Hello World)
	const cube = MeshBuilder.CreateBox("cube", { size: 1 }, scene);
	cube.position.y = 10;
	new PhysicsAggregate(cube, PhysicsShapeType.BOX, { mass: 1, restitution: 0.5 }, scene);

	return { engine, scene };
}
