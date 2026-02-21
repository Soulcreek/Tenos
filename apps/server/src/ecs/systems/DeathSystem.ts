import { AutoAttack, Dead, Health, Target, Velocity } from "@tenos/shared";
import { addComponent, defineQuery, hasComponent } from "bitecs";
import type { IWorld } from "bitecs";

const aliveQuery = defineQuery([Health]);

/** Event produced when an entity dies. */
export interface DeathEvent {
	eid: number;
	/** Entity ID of the last attacker (0 = unknown). */
	killerEid: number;
}

/**
 * Checks for entities with HP <= 0 and marks them Dead.
 * Stops their movement and clears their target.
 * lastHitMap: maps entity ID → last attacker entity ID.
 */
export function deathSystem(world: IWorld, lastHitMap: Map<number, number>): DeathEvent[] {
	const events: DeathEvent[] = [];
	const entities = aliveQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];

		if (Health.current[eid] > 0) continue;
		if (hasComponent(world, Dead, eid)) continue;

		// Mark as dead
		addComponent(world, Dead, eid);

		// Stop movement
		Velocity.x[eid] = 0;
		Velocity.y[eid] = 0;
		Velocity.z[eid] = 0;

		// Clear attack state
		AutoAttack.active[eid] = 0;
		Target.eid[eid] = 0;

		const killerEid = lastHitMap.get(eid) ?? 0;
		events.push({ eid, killerEid });
	}

	return events;
}
