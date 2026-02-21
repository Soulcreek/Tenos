import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import {
	CLASS_SKILLS,
	type CharacterClass,
	type EquipmentSlots,
	type InventorySlot,
	LocalPlayer,
	Position,
	RemotePlayer,
	Rotation,
	SKILL_DEFS,
	Velocity,
	createEmptyEquipment,
	createWorld,
	movementSystem,
} from "@tenos/shared";
import { addComponent, addEntity, removeEntity } from "bitecs";
import { GameCamera } from "./camera/GameCamera.js";
import { createDamageNumberSystem } from "./ecs/systems/DamageNumberSystem.js";
import { createDeathEffect } from "./ecs/systems/DeathEffectSystem.js";
import { createInputSystem } from "./ecs/systems/InputSystem.js";
import { createLootMeshSystem } from "./ecs/systems/LootMeshSystem.js";
import { createMeshSyncSystem } from "./ecs/systems/MeshSyncSystem.js";
import { createMonsterMeshSyncSystem } from "./ecs/systems/MonsterMeshSyncSystem.js";
import { createTargetSelectionSystem } from "./ecs/systems/TargetSelectionSystem.js";
import { HealEffectManager } from "./effects/HealEffect.js";
import { ProjectileEffectManager } from "./effects/ProjectileEffect.js";
import { TargetRing } from "./effects/TargetRing.js";
import { createEngine } from "./engine/Engine.js";
import { createScene } from "./engine/SceneManager.js";
import { InputManager } from "./input/InputManager.js";
import { NetworkManager, type RemoteMonsterData } from "./network/NetworkManager.js";
import { initUI } from "./ui/App.jsx";

function setLoadingStatus(msg: string) {
	const el = document.querySelector("#loading-screen span");
	if (el) el.textContent = msg;
}

function hideLoading() {
	const el = document.getElementById("loading-screen");
	if (el) el.style.display = "none";
}

async function main() {
	const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
	if (!canvas) throw new Error("Canvas element not found");

	// ── Engine ──────────────────────────────────────────────────
	setLoadingStatus("Initializing engine...");
	const { engine, type: engineType } = await createEngine(canvas);
	setLoadingStatus("Creating scene...");
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

	// Map of remote EID → netId for mesh metadata
	const remoteEidToNetId = new Map<number, number>();
	const meshSyncSystem = createMeshSyncSystem(scene, shadowGenerator, remoteEidToNetId);

	// ── Camera ─────────────────────────────────────────────────
	const gameCamera = new GameCamera(scene, canvas, localCharacter.rootNode);
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
		if (data.netId > 0) {
			remoteEidToNetId.set(eid, data.netId);
		}
	});

	network.on("playerLeave", (sessionId) => {
		const eid = remoteEids.get(sessionId);
		if (eid !== undefined) {
			removeEntity(world, eid);
			remoteEids.delete(sessionId);
			remoteEidToNetId.delete(eid);
		}
	});

	// ── Combat Systems ─────────────────────────────────────────
	const monsterMeshSync = createMonsterMeshSyncSystem(scene, shadowGenerator);
	const lootMeshSystem = createLootMeshSystem(scene);
	const targetRing = new TargetRing(scene);
	const targetSelection = createTargetSelectionSystem(scene, inputManager, network, () => ({
		x: Position.x[playerEid],
		z: Position.z[playerEid],
	}));

	// Damage numbers overlay
	const dmgContainer = document.createElement("div");
	dmgContainer.id = "damage-numbers";
	dmgContainer.style.position = "absolute";
	dmgContainer.style.top = "0";
	dmgContainer.style.left = "0";
	dmgContainer.style.width = "100%";
	dmgContainer.style.height = "100%";
	dmgContainer.style.pointerEvents = "none";
	dmgContainer.style.overflow = "hidden";
	document.body.appendChild(dmgContainer);
	const damageNumbers = createDamageNumberSystem(dmgContainer);

	// ── Projectile & Heal Effects ─────────────────────────────
	const projectileEffects = new ProjectileEffectManager(scene);
	const healEffects = new HealEffectManager(scene);

	// ── Combat State ───────────────────────────────────────────
	let currentXP = 0;
	let xpToLevel = 100;
	let isDead = false;
	let respawnTimer = 0;
	let xpLost = 0;
	const combatLog: string[] = [];
	const lootPopups: Array<{ name: string; qty: number; time: number }> = [];
	let playerStats = {
		str: 12,
		dex: 8,
		int: 5,
		vit: 10,
		statPoints: 0,
		attackPower: 0,
		defense: 0,
		attackSpeed: 0,
		critChance: 0,
		moveSpeed: 0,
	};

	// ── Class & Skill State ──────────────────────────────────
	let needsClassSelect = false;
	const skillCooldowns = [0, 0];
	const skillCooldownMaxes = [0, 0];

	// ── Inventory State ──────────────────────────────────────
	let inventorySlots: (InventorySlot | null)[] = new Array(45).fill(null);
	let equipmentSlots: EquipmentSlots = createEmptyEquipment();
	let yang = 0;
	let lastUpgradeResult: {
		success: boolean;
		destroyed: boolean;
		itemName: string;
		newLevel: number;
	} | null = null;

	// ── Monster Network Events ─────────────────────────────────
	network.on("monsterAdd", (data) => {
		monsterMeshSync.addMonster(data);
	});

	network.on("monsterRemove", (netId) => {
		monsterMeshSync.removeMonster(netId);
	});

	network.on("monsterUpdate", (data) => {
		monsterMeshSync.updateMonster(data);
	});

	// ── Combat Events ──────────────────────────────────────────
	network.on("damage", (msg) => {
		// Find the target mesh — could be a monster or a player
		const monster = monsterMeshSync.getMonster(msg.targetNetId);
		let targetMesh: import("@babylonjs/core/Meshes/abstractMesh").AbstractMesh | null = null;

		if (monster) {
			monsterMeshSync.flashMonster(msg.targetNetId);
			targetMesh = monster.mesh;
		} else {
			// Look for player mesh by netId in metadata
			for (const mesh of scene.meshes) {
				if (mesh.metadata?.netId === msg.targetNetId && mesh.metadata?.entityType === "player") {
					targetMesh = mesh;
					// Flash player mesh on hit
					const mat = mesh.material as
						| import("@babylonjs/core/Materials/standardMaterial").StandardMaterial
						| null;
					if (mat?.diffuseColor) {
						const orig = mat.diffuseColor.clone();
						mat.diffuseColor.set(1, 1, 1);
						setTimeout(() => {
							mat.diffuseColor = orig;
						}, 100);
					}
					break;
				}
			}
		}

		// Spawn floating damage number at target screen position
		if (targetMesh && scene.activeCamera) {
			const screenPos = Vector3.Project(
				targetMesh.position,
				targetMesh.getWorldMatrix(),
				scene.getTransformMatrix(),
				scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
			);
			const type = msg.isCrit ? "crit" : "normal";
			damageNumbers.spawn(screenPos.x, screenPos.y - 30, msg.amount, type);
		}

		// Add to combat log
		combatLog.push(`Hit for ${msg.amount}${msg.isCrit ? " CRIT!" : ""}`);
		if (combatLog.length > 50) combatLog.shift();
	});

	network.on("entityDied", (msg) => {
		if (msg.isMonster) {
			const monster = monsterMeshSync.getMonster(msg.netId);
			if (monster) {
				createDeathEffect(scene, monster.mesh.getAbsolutePosition().clone());
			}
			combatLog.push("Monster defeated!");
		} else {
			// Player killed — find their mesh for death effect
			for (const mesh of scene.meshes) {
				if (mesh.metadata?.netId === msg.netId && mesh.metadata?.entityType === "player") {
					createDeathEffect(scene, mesh.getAbsolutePosition().clone());
					break;
				}
			}
			combatLog.push("Player defeated!");
		}
	});

	network.on("xpGain", (msg) => {
		currentXP = msg.totalXP;
		xpToLevel = msg.xpToLevel;
		combatLog.push(`+${msg.amount} XP`);
	});

	network.on("levelUp", (msg) => {
		playerStats.statPoints = msg.statPoints;
		combatLog.push(`LEVEL UP! Now level ${msg.newLevel}`);
	});

	network.on("lootSpawn", (_msg) => {
		// Handled by schema lootAdd
	});

	network.on("lootAdd", (data) => {
		lootMeshSystem.addLoot(data);
	});

	network.on("lootRemove", (key) => {
		lootMeshSystem.removeLootByKey(key);
	});

	network.on("lootPickup", (msg) => {
		lootPopups.push({ name: msg.name, qty: msg.qty, time: 3 });
		combatLog.push(`Picked up ${msg.name} x${msg.qty}`);
	});

	network.on("playerDeath", (msg) => {
		isDead = true;
		respawnTimer = msg.respawnTime;
		xpLost = msg.xpLost;
		combatLog.push(`You died! Lost ${msg.xpLost} XP.`);
	});

	network.on("playerRespawn", (_msg) => {
		isDead = false;
		respawnTimer = 0;
	});

	network.on("statUpdate", (msg) => {
		playerStats = {
			str: msg.str,
			dex: msg.dex,
			int: msg.int,
			vit: msg.vit,
			statPoints: msg.statPoints,
			attackPower: msg.attackPower,
			defense: msg.defense,
			attackSpeed: msg.attackSpeed,
			critChance: msg.critChance,
			moveSpeed: msg.moveSpeed,
		};
	});

	// ── M3: Class & Skill Events ─────────────────────────────
	network.on("classSelectPrompt", () => {
		needsClassSelect = true;
	});

	network.on("projectileSpawn", (msg) => {
		projectileEffects.spawn(msg.id, msg.fromX, msg.fromZ, msg.toNetId, msg.speed, msg.type);
	});

	network.on("healEffect", (msg) => {
		// Find position of target
		const monster = monsterMeshSync.getMonster(msg.targetNetId);
		if (monster) {
			healEffects.spawn(monster.mesh.position.x, monster.mesh.position.z);
		} else {
			// Check if it's us
			const pos = Position;
			healEffects.spawn(pos.x[playerEid], pos.z[playerEid]);
		}

		// Damage number as heal
		if (scene.activeCamera) {
			const targetPos =
				monster?.mesh.position ??
				new Vector3(Position.x[playerEid], Position.y[playerEid], Position.z[playerEid]);
			const screenPos = Vector3.Project(
				targetPos,
				scene.getTransformMatrix().clone(),
				scene.getTransformMatrix(),
				scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()),
			);
			damageNumbers.spawn(screenPos.x, screenPos.y - 30, msg.amount, "heal");
		}
	});

	network.on("skillEffect", (_msg) => {
		// Visual handled by projectile/heal listeners
	});

	network.on("buffApply", (msg) => {
		combatLog.push(`Buff applied: ${msg.buffId}`);
	});

	// ── M3: Inventory Events ─────────────────────────────────
	network.on("inventorySync", (msg) => {
		inventorySlots = msg.inventory;
		equipmentSlots = msg.equipment;
		yang = msg.yang;
	});

	network.on("upgradeResult", (msg) => {
		lastUpgradeResult = msg;
		if (msg.success) {
			combatLog.push(`Upgrade success! ${msg.itemName} is now +${msg.newLevel}`);
		} else if (msg.destroyed) {
			combatLog.push(`${msg.itemName} was destroyed!`);
		} else {
			combatLog.push(`Upgrade failed on ${msg.itemName}`);
		}
	});

	// Connect in background (non-blocking)
	setLoadingStatus("Connecting to server...");
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
		getHealth: () => ({
			current: network.connected ? network.selfHp : 100,
			max: network.connected ? network.selfHpMax : 100,
		}),
		getMana: () => ({
			current: network.connected ? network.selfMp : 50,
			max: network.connected ? network.selfMpMax : 50,
		}),
		getZoneName: () => "Shinsoo Village",
		getLevel: () => (network.connected ? network.selfLevel : 1),
		getXP: () => ({ current: currentXP, toLevel: xpToLevel }),
		getTarget: () => {
			const netId = targetSelection.getCurrentTarget();
			if (netId === 0) return null;
			const monsterData = network.getRemoteMonsters().get(netId);
			if (monsterData) {
				return {
					name: `Monster Lv.${monsterData.level}`,
					typeId: monsterData.typeId,
					hp: monsterData.hp,
					hpMax: monsterData.hpMax,
					level: monsterData.level,
				};
			}
			for (const [, playerData] of network.getRemotePlayers()) {
				if (playerData.netId === netId) {
					return {
						name: playerData.name || "Player",
						typeId: 0,
						hp: playerData.hp,
						hpMax: playerData.hpMax,
						level: playerData.level,
					};
				}
			}
			return null;
		},
		getIsDead: () => isDead,
		getRespawnTimer: () => respawnTimer,
		getXPLost: () => xpLost,
		getCombatLog: () => combatLog,
		getLootPopups: () => lootPopups,
		getPlayerStats: () => playerStats,
		allocateStat: (stat: "str" | "dex" | "int" | "vit") => {
			network.sendAllocateStat(stat);
		},
		// M3: Class & Skills
		getCharacterClass: () => network.selfCharacterClass ?? "warrior",
		getSkills: () => {
			const cls = (network.selfCharacterClass ?? "warrior") as CharacterClass;
			const skillIds = CLASS_SKILLS[cls] ?? ["cleave", "iron_will"];
			return skillIds.map((id, i) => {
				const def = SKILL_DEFS[id];
				return {
					id,
					name: def?.name ?? id,
					manaCost: def?.manaCost ?? 0,
					cooldown: skillCooldowns[i],
					cooldownMax: skillCooldownMaxes[i],
					key: String(i + 1),
				};
			});
		},
		getNeedsClassSelect: () => needsClassSelect,
		selectClass: (cls: string) => {
			needsClassSelect = false;
			network.sendClassSelect(cls);
		},
		// M3: Inventory
		getInventory: () => inventorySlots,
		getEquipment: () => equipmentSlots,
		getYang: () => yang,
		sendEquipItem: (slot: number) => network.sendEquipItem(slot),
		sendUnequipItem: (slot: string) => network.sendUnequipItem(slot),
		sendDropItem: (slot: number, qty: number) => network.sendDropItem(slot, qty),
		sendUseItem: (slot: number) => network.sendUseItem(slot),
		sendUpgradeItem: (slot: number, useSeal: boolean) => network.sendUpgradeItem(slot, useSeal),
		getUpgradeResult: () => {
			const r = lastUpgradeResult;
			lastUpgradeResult = null;
			return r;
		},
	};

	const uiRoot = document.getElementById("ui-root");
	if (uiRoot) initUI(uiRoot, engine, engineType, hudState);

	// ── Game Loop ──────────────────────────────────────────────
	let lastTime = performance.now();
	let inputTickAccum = 0;
	const INPUT_SEND_INTERVAL = 1 / 20;

	hideLoading();
	engine.runRenderLoop(() => {
		const now = performance.now();
		const dt = Math.min((now - lastTime) / 1000, 0.1);
		lastTime = now;

		// Client ECS systems
		if (!isDead) {
			inputSystem(world, dt);
		}
		movementSystem(world, dt);

		// Target selection (click/tab)
		targetSelection.update();

		// Sync local player ECS → mesh
		localCharacter.setPosition(Position.x[playerEid], Position.y[playerEid], Position.z[playerEid]);
		if (Velocity.x[playerEid] !== 0 || Velocity.z[playerEid] !== 0) {
			localCharacter.setRotationY(Rotation.y[playerEid]);
		}
		localCharacter.update(dt);

		// Sync remote players ECS → meshes (lerped)
		meshSyncSystem(world, dt);

		// Lerp monster meshes
		monsterMeshSync.lerpMonsters(network.getRemoteMonsters() as Map<number, RemoteMonsterData>, dt);

		// Animate loot meshes (hover + rotate)
		lootMeshSystem.update(dt);

		// Update target ring
		const targetNetId = targetSelection.getCurrentTarget();
		if (targetNetId > 0) {
			const targetMonster = monsterMeshSync.getMonster(targetNetId);
			if (targetMonster) {
				targetRing.update(targetMonster.mesh);
				targetRing.show(targetMonster.mesh);
			} else {
				// Check for player mesh with this netId
				let playerMesh: import("@babylonjs/core/Meshes/abstractMesh").AbstractMesh | null = null;
				for (const mesh of scene.meshes) {
					if (mesh.metadata?.netId === targetNetId && mesh.metadata?.entityType === "player") {
						playerMesh = mesh;
						break;
					}
				}
				if (playerMesh) {
					targetRing.update(playerMesh);
					targetRing.show(playerMesh);
				} else {
					targetRing.hide();
				}
			}
		} else {
			targetRing.hide();
		}

		// Update projectile and heal effects
		projectileEffects.update(dt, (netId) => {
			const monster = monsterMeshSync.getMonster(netId);
			if (monster) return { x: monster.mesh.position.x, z: monster.mesh.position.z };
			for (const [, p] of network.getRemotePlayers()) {
				if (p.netId === netId) return { x: p.x, z: p.z };
			}
			return null;
		});
		healEffects.update(dt);

		// Tick skill cooldowns client-side for responsive UI
		for (let i = 0; i < 2; i++) {
			if (skillCooldowns[i] > 0) {
				skillCooldowns[i] = Math.max(0, skillCooldowns[i] - dt);
			}
		}

		// Skill keybinds (1, 2)
		if (!isDead && network.connected) {
			if (inputManager.isKeyDown("1")) {
				const cls = (network.selfCharacterClass ?? "warrior") as CharacterClass;
				const skillIds = CLASS_SKILLS[cls];
				const def = SKILL_DEFS[skillIds?.[0]];
				if (skillCooldowns[0] <= 0 && def) {
					network.sendUseSkill(1);
					skillCooldowns[0] = def.cooldown;
					skillCooldownMaxes[0] = def.cooldown;
				}
			}
			if (inputManager.isKeyDown("2")) {
				const cls = (network.selfCharacterClass ?? "warrior") as CharacterClass;
				const skillIds = CLASS_SKILLS[cls];
				const def = SKILL_DEFS[skillIds?.[1]];
				if (skillCooldowns[1] <= 0 && def) {
					network.sendUseSkill(2);
					skillCooldowns[1] = def.cooldown;
					skillCooldownMaxes[1] = def.cooldown;
				}
			}
		}

		// Update damage numbers
		damageNumbers.update(dt);

		// Update loot popup timers
		for (let i = lootPopups.length - 1; i >= 0; i--) {
			lootPopups[i].time -= dt;
			if (lootPopups[i].time <= 0) {
				lootPopups.splice(i, 1);
			}
		}

		// Update respawn timer
		if (isDead && respawnTimer > 0) {
			respawnTimer -= dt;
		}

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

main().catch((err) => {
	console.error("[Main] Fatal error:", err);
	// Hide loading screen so the error overlay is clearly visible
	const loading = document.getElementById("loading-screen");
	if (loading) loading.style.display = "none";
	const show = (window as unknown as { __tenosError?: (m: string) => void }).__tenosError;
	if (show) show(String(err?.stack || err));
});
