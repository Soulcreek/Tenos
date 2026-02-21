import { LootDrop } from "@tenos/shared";
import { defineQuery, removeEntity } from "bitecs";
import type { IWorld } from "bitecs";

const lootQuery = defineQuery([LootDrop]);

/** Entity IDs of loot that despawned this tick. */
export function lootDropSystem(world: IWorld, dt: number): number[] {
	const despawned: number[] = [];
	const entities = lootQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];

		LootDrop.despawnTimer[eid] -= dt;
		if (LootDrop.despawnTimer[eid] <= 0) {
			despawned.push(eid);
			removeEntity(world, eid);
		}
	}

	return despawned;
}
