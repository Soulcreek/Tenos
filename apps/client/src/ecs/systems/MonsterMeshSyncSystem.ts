import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { Scene } from "@babylonjs/core/scene";
import { MONSTER_TYPES } from "@tenos/shared";
import { MonsterRenderer } from "../../entities/MonsterRenderer.js";

const LERP_FACTOR = 0.15;

export interface MonsterSyncData {
	netId: number;
	typeId: number;
	x: number;
	y: number;
	z: number;
	rotY: number;
	hp: number;
	hpMax: number;
	level: number;
	isDead: boolean;
}

/**
 * Creates/destroys/lerps monster meshes from Colyseus MonsterState changes.
 */
export function createMonsterMeshSyncSystem(scene: Scene, shadowGenerator: ShadowGenerator) {
	const monsters = new Map<number, MonsterRenderer>();

	return {
		/** Add a monster mesh when it appears in the schema. */
		addMonster(data: MonsterSyncData): void {
			if (monsters.has(data.netId)) return;

			const def = MONSTER_TYPES[data.typeId];
			const renderer = new MonsterRenderer(scene, shadowGenerator, {
				netId: data.netId,
				name: def?.name ?? `Monster ${data.netId}`,
				color: def?.color ?? [0.5, 0.5, 0.5],
				scale: def?.scale ?? 1.0,
				typeId: data.typeId,
			});
			renderer.setPosition(data.x, data.y, data.z);
			monsters.set(data.netId, renderer);
		},

		/** Remove a monster mesh. */
		removeMonster(netId: number): void {
			const renderer = monsters.get(netId);
			if (renderer) {
				renderer.dispose();
				monsters.delete(netId);
			}
		},

		/** Update monster data (called when schema changes). */
		updateMonster(data: MonsterSyncData): void {
			const renderer = monsters.get(data.netId);
			if (!renderer) return;

			if (data.isDead) {
				renderer.setVisibility(0.4);
			} else {
				renderer.setVisibility(1.0);
			}
		},

		/** Called every frame to lerp monster positions. */
		lerpMonsters(monsterDataMap: Map<number, MonsterSyncData>, dt: number): void {
			for (const [netId, renderer] of monsters) {
				const data = monsterDataMap.get(netId);
				if (!data) continue;

				// Lerp root node position
				const pos = renderer.rootNode.position;
				pos.x += (data.x - pos.x) * LERP_FACTOR;
				pos.y += (data.y - pos.y) * LERP_FACTOR;
				pos.z += (data.z - pos.z) * LERP_FACTOR;

				// Snap rotation
				renderer.setRotationY(data.rotY);

				// Drive animation
				renderer.update(dt);
			}
		},

		/** Get a monster renderer by netId. */
		getMonster(netId: number): MonsterRenderer | undefined {
			return monsters.get(netId);
		},

		/** Get all monster renderers. */
		getAllMonsters(): Map<number, MonsterRenderer> {
			return monsters;
		},

		/** Flash a monster when hit. */
		flashMonster(netId: number): void {
			const renderer = monsters.get(netId);
			if (renderer) renderer.flashHit();
		},
	};
}
