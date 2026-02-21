import { Dead, Health, Position, Projectile } from "@tenos/shared";
import { defineQuery, hasComponent, removeEntity } from "bitecs";
import type { IWorld } from "bitecs";
import type { DamageEvent } from "./AutoAttackSystem.js";

const projectileQuery = defineQuery([Projectile, Position]);

/**
 * Moves projectiles toward their target. On arrival, applies damage and removes entity.
 * Returns damage events for broadcasting.
 */
export function projectileSystem(
	world: IWorld,
	dt: number,
): { damages: DamageEvent[]; removed: number[] } {
	const damages: DamageEvent[] = [];
	const removed: number[] = [];
	const entities = projectileQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];
		const targetEid = Projectile.targetEid[eid];

		// Reduce lifetime
		Projectile.lifetime[eid] -= dt;

		// Remove if target died or lifetime expired
		if (Projectile.lifetime[eid] <= 0 || hasComponent(world, Dead, targetEid)) {
			removed.push(eid);
			removeEntity(world, eid);
			continue;
		}

		// Move toward target
		const dx = Position.x[targetEid] - Position.x[eid];
		const dz = Position.z[targetEid] - Position.z[eid];
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist < 0.5) {
			// Hit! Apply damage
			const damage = Projectile.damage[eid];
			const isCrit = Projectile.isCrit[eid] === 1;
			Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);

			damages.push({
				attackerEid: Projectile.ownerEid[eid],
				targetEid,
				amount: damage,
				isCrit,
				remainingHp: Health.current[targetEid],
			});

			removed.push(eid);
			removeEntity(world, eid);
			continue;
		}

		// Move projectile
		const speed = Projectile.speed[eid];
		const moveAmount = Math.min(speed * dt, dist);
		const ratio = moveAmount / dist;
		Position.x[eid] += dx * ratio;
		Position.z[eid] += dz * ratio;
	}

	return { damages, removed };
}
