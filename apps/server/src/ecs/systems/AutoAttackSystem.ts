import {
	ASSASSIN_BOW_RANGE,
	ASSASSIN_MELEE_THRESHOLD,
	AutoAttack,
	CLASS_ID,
	ClassInfo,
	CombatStats,
	Dead,
	Health,
	MELEE_RANGE,
	NetworkIdentity,
	Position,
	Projectile,
	RANGED_ATTACK_RANGE,
	Target,
	calculateMagicDamage,
	calculatePhysicalDamage,
} from "@tenos/shared";
import { Not, addComponent, addEntity, defineQuery, hasComponent } from "bitecs";
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

export interface AutoAttackProjectile {
	eid: number;
	ownerEid: number;
	targetEid: number;
	speed: number;
	type: "bolt" | "arrow";
}

/**
 * Processes auto-attacks for entities with an active target.
 * Class-aware: warrior melee, magician ranged bolt, assassin bow/dagger hybrid.
 */
export function autoAttackSystem(
	world: IWorld,
	dt: number,
	nextNetId?: () => number,
): { events: DamageEvent[]; projectiles: AutoAttackProjectile[] } {
	const events: DamageEvent[] = [];
	const projectiles: AutoAttackProjectile[] = [];
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
		const dist = Math.sqrt(distSq);

		// Determine class-based attack behavior
		const classId = hasComponent(world, ClassInfo, eid) ? ClassInfo.classId[eid] : CLASS_ID.WARRIOR;
		let attackRange: number;
		let isRanged = false;
		let projectileType: "bolt" | "arrow" = "arrow";
		let isMagicAttack = false;

		switch (classId) {
			case CLASS_ID.MAGICIAN:
				attackRange = RANGED_ATTACK_RANGE;
				isRanged = true;
				projectileType = "bolt";
				isMagicAttack = true;
				break;
			case CLASS_ID.ASSASSIN:
				if (dist > ASSASSIN_MELEE_THRESHOLD) {
					attackRange = ASSASSIN_BOW_RANGE;
					isRanged = true;
					projectileType = "arrow";
				} else {
					attackRange = MELEE_RANGE;
				}
				break;
			default: // WARRIOR
				attackRange = MELEE_RANGE;
				break;
		}

		if (dist > attackRange) continue;

		// Tick cooldown
		AutoAttack.cooldown[eid] -= dt;
		if (AutoAttack.cooldown[eid] > 0) continue;

		// Reset cooldown based on attack speed
		const atkSpeed = CombatStats.attackSpeed[eid];
		AutoAttack.cooldown[eid] = atkSpeed > 0 ? 1.0 / atkSpeed : 1.0;

		// Calculate damage
		const isCrit = Math.random() < CombatStats.critChance[eid];
		const targetDef = CombatStats.defense[targetEid] ?? 0;

		if (isRanged && nextNetId) {
			// Spawn projectile
			let damage: number;
			if (isMagicAttack) {
				const spellPower = CombatStats.int[eid] * 2.5;
				damage = calculateMagicDamage(spellPower, targetDef, isCrit);
			} else {
				damage = calculatePhysicalDamage(CombatStats.attackPower[eid], targetDef, isCrit);
			}

			const projEid = addEntity(world);
			addComponent(world, Position, projEid);
			addComponent(world, Projectile, projEid);
			addComponent(world, NetworkIdentity, projEid);

			NetworkIdentity.netId[projEid] = nextNetId();
			Position.x[projEid] = Position.x[eid];
			Position.y[projEid] = 1.0;
			Position.z[projEid] = Position.z[eid];

			Projectile.ownerEid[projEid] = eid;
			Projectile.targetEid[projEid] = targetEid;
			Projectile.speed[projEid] = 18;
			Projectile.damage[projEid] = damage;
			Projectile.isMagic[projEid] = isMagicAttack ? 1 : 0;
			Projectile.isCrit[projEid] = isCrit ? 1 : 0;
			Projectile.lifetime[projEid] = 3;

			projectiles.push({
				eid: projEid,
				ownerEid: eid,
				targetEid,
				speed: 18,
				type: projectileType,
			});
		} else {
			// Melee attack — instant damage
			const damage = calculatePhysicalDamage(CombatStats.attackPower[eid], targetDef, isCrit);
			Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);

			events.push({
				attackerEid: eid,
				targetEid,
				amount: damage,
				isCrit,
				remainingHp: Health.current[targetEid],
			});
		}
	}

	return { events, projectiles };
}
