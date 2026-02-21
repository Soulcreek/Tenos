import { Dead, Health, Mana } from "@tenos/shared";
import { Not, defineQuery } from "bitecs";
import type { IWorld } from "bitecs";

const aliveWithHealth = defineQuery([Health, Not(Dead)]);

/**
 * Regenerates HP and MP for alive entities each tick.
 * Server-authoritative; runs at 20Hz.
 */
export function healthRegenSystem(world: IWorld, dt: number): void {
	const entities = aliveWithHealth(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];

		// HP regen
		if (Health.current[eid] < Health.max[eid]) {
			Health.current[eid] = Math.min(
				Health.max[eid],
				Health.current[eid] + Health.regenRate[eid] * dt,
			);
		}

		// MP regen
		if (Mana.current[eid] < Mana.max[eid]) {
			Mana.current[eid] = Math.min(Mana.max[eid], Mana.current[eid] + Mana.regenRate[eid] * dt);
		}
	}
}
