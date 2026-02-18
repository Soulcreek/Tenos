import {
	LocalPlayer,
	Position,
	RemotePlayer,
	Rotation,
	Velocity,
	createWorld,
	movementSystem,
} from "@tenos/shared";
import { addComponent, addEntity, removeEntity } from "bitecs";
import { GameCamera } from "./camera/GameCamera.js";
import { createInputSystem } from "./ecs/systems/InputSystem.js";
import { createMeshSyncSystem } from "./ecs/systems/MeshSyncSystem.js";
import { createEngine } from "./engine/Engine.js";
import { createScene } from "./engine/SceneManager.js";
import { InputManager } from "./input/InputManager.js";
import { NetworkManager } from "./network/NetworkManager.js";
import { initUI } from "./ui/App.jsx";

async function main() {
	const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
	if (!canvas) throw new Error("Canvas element not found");

	// ── Engine ──────────────────────────────────────────────────
	const { engine, type: engineType } = await createEngine(canvas);
	const { scene, localCharacter, shadowGenerator } = await createScene(engine);

	// ── ECS World ──────────────────────────────────────────────
	const world = createWorld();
	const playerEid = addEntity(world);
	addComponent(world, Position, playerEid);
	addComponent(world, Velocity, playerEid);
	addComponent(world, Rotation, playerEid);
	addComponent(world, LocalPlayer, playerEid);

	// ── Systems ────────────────────────────────────────────────
	const inputManager = new InputManager(canvas);
	const inputSystem = createInputSystem(inputManager);
	const meshSyncSystem = createMeshSyncSystem(scene, shadowGenerator);

	// ── Camera ─────────────────────────────────────────────────
	const gameCamera = new GameCamera(scene, canvas, localCharacter.mesh);
	scene.activeCamera = gameCamera.camera;

	// ── Network ────────────────────────────────────────────────
	const network = new NetworkManager();
	const remoteEids = new Map<string, number>();

	network.on("playerJoin", (sessionId, data) => {
		const eid = addEntity(world);
		addComponent(world, Position, eid);
		addComponent(world, Rotation, eid);
		addComponent(world, RemotePlayer, eid);
		Position.x[eid] = data.x;
		Position.y[eid] = data.y;
		Position.z[eid] = data.z;
		Rotation.y[eid] = data.rotY;
		remoteEids.set(sessionId, eid);
	});

	network.on("playerLeave", (sessionId) => {
		const eid = remoteEids.get(sessionId);
		if (eid !== undefined) {
			removeEntity(world, eid);
			remoteEids.delete(sessionId);
		}
	});

	// Connect in background (non-blocking)
	network.joinZone().catch(() => {
		console.info("[Main] Running in offline mode (no server)");
	});

	// ── HUD ────────────────────────────────────────────────────
	const hudState = {
		getPlayerPos: () => ({
			x: Position.x[playerEid],
			y: Position.y[playerEid],
			z: Position.z[playerEid],
		}),
		getPlayerCount: () => (network.connected ? network.playerCount : 1),
		getHealth: () => ({ current: 100, max: 100 }),
		getMana: () => ({ current: 50, max: 50 }),
		getZoneName: () => "Shinsoo Village",
	};

	const uiRoot = document.getElementById("ui-root");
	if (uiRoot) initUI(uiRoot, engine, engineType, hudState);

	// ── Game Loop ──────────────────────────────────────────────
	let lastTime = performance.now();
	let inputTickAccum = 0;
	const INPUT_SEND_INTERVAL = 1 / 20; // send input at 20Hz

	engine.runRenderLoop(() => {
		const now = performance.now();
		const dt = Math.min((now - lastTime) / 1000, 0.1);
		lastTime = now;

		// Client ECS systems
		inputSystem(world, dt);
		movementSystem(world, dt);

		// Sync local player ECS → mesh
		localCharacter.setPosition(Position.x[playerEid], Position.y[playerEid], Position.z[playerEid]);
		if (Velocity.x[playerEid] !== 0 || Velocity.z[playerEid] !== 0) {
			localCharacter.setRotationY(Rotation.y[playerEid]);
		}

		// Sync remote players ECS → meshes (lerped)
		meshSyncSystem(world);

		// Update remote player ECS positions from network data
		for (const [sessionId, data] of network.getRemotePlayers()) {
			const eid = remoteEids.get(sessionId);
			if (eid === undefined) continue;
			Position.x[eid] = data.x;
			Position.y[eid] = data.y;
			Position.z[eid] = data.z;
			Rotation.y[eid] = data.rotY;
		}

		// Send input to server at 20Hz
		if (network.connected) {
			inputTickAccum += dt;
			if (inputTickAccum >= INPUT_SEND_INTERVAL) {
				const { x: moveX, z: moveZ } = inputManager.getMovement();
				network.sendInput(moveX, moveZ, inputManager.isJumpPressed());
				inputTickAccum = 0;
			}
		}

		// Camera follow
		gameCamera.update();

		scene.render();
	});

	window.addEventListener("resize", () => {
		engine.resize();
	});
}

main().catch(console.error);
