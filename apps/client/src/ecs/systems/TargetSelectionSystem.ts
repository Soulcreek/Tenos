import type { Scene } from "@babylonjs/core/scene";
import type { InputManager } from "../../input/InputManager.js";
import type { NetworkManager } from "../../network/NetworkManager.js";
import { pickEntityFull } from "../../utils/pickEntity.js";

/**
 * Handles target selection via left-click ray-picking and tab cycling.
 * Sends select_target and request_attack messages to server.
 * Clicking loot sends a pickup request instead.
 */
export function createTargetSelectionSystem(
	scene: Scene,
	inputManager: InputManager,
	network: NetworkManager,
	getPlayerPos?: () => { x: number; z: number },
) {
	let currentTargetNetId = 0;

	return {
		/** Call once per frame. */
		update(): void {
			// Left-click: pick entity
			if (inputManager.leftClickThisFrame && !inputManager.isSuppressed) {
				const result = pickEntityFull(scene, inputManager.mouseX, inputManager.mouseY);

				if (result.netId > 0) {
					if (result.entityType === "loot") {
						// Clicking loot sends a pickup request, not a target/attack
						network.sendPickupLoot(result.netId);
					} else {
						currentTargetNetId = result.netId;
						network.sendSelectTarget(result.netId);
						network.sendRequestAttack(result.netId);
					}
				} else {
					// Clicked empty space: deselect
					currentTargetNetId = 0;
					network.sendSelectTarget(0);
				}
			}

			// Tab key: cycle through nearby monsters sorted by distance
			if (inputManager.tabPressedThisFrame && !inputManager.isSuppressed) {
				const monsters = network.getRemoteMonsters();
				if (monsters.size === 0) return;

				// Build sorted list of alive monsters by distance
				const playerPos = getPlayerPos?.() ?? { x: 0, z: 0 };
				const sorted: Array<{ netId: number; distSq: number }> = [];

				for (const [netId, data] of monsters) {
					if (data.isDead) continue;
					const dx = data.x - playerPos.x;
					const dz = data.z - playerPos.z;
					sorted.push({ netId, distSq: dx * dx + dz * dz });
				}

				if (sorted.length === 0) return;

				sorted.sort((a, b) => a.distSq - b.distSq);

				// Find current target in list and cycle to next
				const currentIdx = sorted.findIndex((m) => m.netId === currentTargetNetId);
				const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % sorted.length;
				const nextNetId = sorted[nextIdx].netId;

				currentTargetNetId = nextNetId;
				network.sendSelectTarget(nextNetId);
				network.sendRequestAttack(nextNetId);
			}
		},

		/** Get current target net ID. */
		getCurrentTarget(): number {
			return currentTargetNetId;
		},

		/** Set target (e.g., from external event). */
		setTarget(netId: number): void {
			currentTargetNetId = netId;
		},
	};
}
