import {
	AutoAttack,
	Dead,
	Health,
	Mana,
	Monster,
	PLAYER_RESPAWN_DELAY,
	Position,
	Spawner,
	Target,
	Velocity,
} from "@tenos/shared";
import { defineQuery, hasComponent, removeComponent, removeEntity } from "bitecs";
import type { IWorld } from "bitecs";

const deadQuery = defineQuery([Dead]);

/** Event produced when a player respawns. */
export interface RespawnEvent {
	eid: number;
	x: number;
	z: number;
}

/**
 * Manages respawn timers for dead players and monsters.
 * - Players: respawn after PLAYER_RESPAWN_DELAY at origin.
 * - Monsters: removed from world, spawner timer resets.
 *
 * respawnTimers: maps entity ID → remaining time.
 */
export function respawnSystem(
	world: IWorld,
	dt: number,
	respawnTimers: Map<number, number>,
	monsterSpawnerMap: Map<number, number>,
): RespawnEvent[] {
	const events: RespawnEvent[] = [];
	const dead = deadQuery(world);

	for (let i = 0; i < dead.length; i++) {
		const eid = dead[i];

		if (hasComponent(world, Monster, eid)) {
			// Monster death: if not already queued for removal, handle it
			if (!respawnTimers.has(eid)) {
				// Set a short delay before removing monster entity
				respawnTimers.set(eid, 3.0); // 3s corpse time
			}

			const timer = respawnTimers.get(eid) ?? 0;
			const newTimer = timer - dt;
			respawnTimers.set(eid, newTimer);

			if (newTimer <= 0) {
				// Find the spawner for this monster
				const spawnerEid = monsterSpawnerMap.get(eid);
				if (spawnerEid !== undefined) {
					// Reset spawner timer
					Spawner.spawnedEid[spawnerEid] = 0;
					Spawner.respawnTimer[spawnerEid] = Spawner.respawnDelay[spawnerEid];
					monsterSpawnerMap.delete(eid);
				}

				// Remove the dead monster entity
				respawnTimers.delete(eid);
				removeEntity(world, eid);
			}
		} else {
			// Player death
			if (!respawnTimers.has(eid)) {
				respawnTimers.set(eid, PLAYER_RESPAWN_DELAY);
			}

			const timer = respawnTimers.get(eid) ?? 0;
			const newTimer = timer - dt;
			respawnTimers.set(eid, newTimer);

			if (newTimer <= 0) {
				// Respawn player at origin
				respawnTimers.delete(eid);
				removeComponent(world, Dead, eid);

				// Reset position to spawn
				Position.x[eid] = 0;
				Position.y[eid] = 0;
				Position.z[eid] = 0;
				Velocity.x[eid] = 0;
				Velocity.y[eid] = 0;
				Velocity.z[eid] = 0;

				// Restore HP/MP to full
				Health.current[eid] = Health.max[eid];
				Mana.current[eid] = Mana.max[eid];

				// Clear combat state
				Target.eid[eid] = 0;
				AutoAttack.active[eid] = 0;

				events.push({ eid, x: 0, z: 0 });
			}
		}
	}

	return events;
}
