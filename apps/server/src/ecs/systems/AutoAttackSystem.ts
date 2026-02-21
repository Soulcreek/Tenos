import {
	AutoAttack,
	CombatStats,
	Dead,
	Health,
	Position,
	Target,
	calculatePhysicalDamage,
} from "@tenos/shared";
import { Not, defineQuery, hasComponent } from "bitecs";
import type { IWorld } from "bitecs";

const attackerQuery = defineQuery([AutoAttack, Target, CombatStats, Position, Health, Not(Dead)]);

/** Event produced when damage is dealt. */
export interface DamageEvent {
	attackerEid: number;
	targetEid: number;
	amount: number;
	isCrit: boolean;
	remainingHp: number;
}

/**
 * Processes auto-attacks for entities with an active target.
 * Checks range, ticks cooldown, calculates damage, subtracts HP.
 * Returns damage events for the room to broadcast.
 */
export function autoAttackSystem(world: IWorld, dt: number): DamageEvent[] {
	const events: DamageEvent[] = [];
	const entities = attackerQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];

		if (AutoAttack.active[eid] === 0) continue;

		const targetEid = Target.eid[eid];
		if (targetEid === 0) {
			AutoAttack.active[eid] = 0;
			continue;
		}

		// Check target is alive
		if (hasComponent(world, Dead, targetEid)) {
			AutoAttack.active[eid] = 0;
			Target.eid[eid] = 0;
			continue;
		}

		// Check target still has Health
		if (Health.current[targetEid] === undefined) {
			AutoAttack.active[eid] = 0;
			Target.eid[eid] = 0;
			continue;
		}

		// Distance check
		const dx = Position.x[targetEid] - Position.x[eid];
		const dz = Position.z[targetEid] - Position.z[eid];
		const distSq = dx * dx + dz * dz;
		const rangeSq = AutoAttack.range[eid] * AutoAttack.range[eid];

		if (distSq > rangeSq) {
			// Out of range — cooldown doesn't tick while out of range
			continue;
		}

		// Tick cooldown
		AutoAttack.cooldown[eid] -= dt;
		if (AutoAttack.cooldown[eid] > 0) continue;

		// Reset cooldown based on attack speed
		const atkSpeed = CombatStats.attackSpeed[eid];
		AutoAttack.cooldown[eid] = atkSpeed > 0 ? 1.0 / atkSpeed : 1.0;

		// Calculate damage
		const isCrit = Math.random() < CombatStats.critChance[eid];
		const damage = calculatePhysicalDamage(
			CombatStats.attackPower[eid],
			CombatStats.defense[targetEid] ?? 0,
			isCrit,
		);

		// Apply damage
		Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);

		events.push({
			attackerEid: eid,
			targetEid,
			amount: damage,
			isCrit,
			remainingHp: Health.current[targetEid],
		});
	}

	return events;
}
