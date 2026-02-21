import {
	Buff,
	CLASS_ID,
	CLASS_SKILLS,
	type CharacterClass,
	ClassInfo,
	CombatStats,
	Dead,
	Health,
	Mana,
	Position,
	SKILL_DEFS,
	SkillCooldown,
	Target,
	calculateMagicDamage,
	calculatePhysicalDamage,
} from "@tenos/shared";
import { NetworkIdentity, Projectile } from "@tenos/shared";
import { addComponent, addEntity, hasComponent } from "bitecs";
import type { IWorld } from "bitecs";

export interface SkillEvent {
	type: "damage" | "heal" | "buff" | "projectile";
	casterEid: number;
	targetEid: number;
	skillId: string;
	amount: number;
	isCrit: boolean;
	remainingHp?: number;
}

export interface ProjectileSpawnEvent {
	eid: number;
	ownerEid: number;
	targetEid: number;
	speed: number;
	type: "bolt" | "arrow";
}

const CLASS_MAP: CharacterClass[] = ["warrior", "magician", "assassin"];

export function processSkillUse(
	world: IWorld,
	casterEid: number,
	slot: number,
	nextNetId: () => number,
): { events: SkillEvent[]; projectiles: ProjectileSpawnEvent[] } {
	const events: SkillEvent[] = [];
	const projectiles: ProjectileSpawnEvent[] = [];

	if (slot !== 1 && slot !== 2) return { events, projectiles };
	if (hasComponent(world, Dead, casterEid)) return { events, projectiles };

	// Get class
	const classId = ClassInfo.classId[casterEid];
	const charClass = CLASS_MAP[classId] ?? "warrior";
	const skillIds = CLASS_SKILLS[charClass];
	const skillId = skillIds[slot - 1];
	const skill = SKILL_DEFS[skillId];
	if (!skill) return { events, projectiles };

	// Check cooldown
	const cdKey = slot === 1 ? "slot1Cd" : "slot2Cd";
	if (SkillCooldown[cdKey][casterEid] > 0) return { events, projectiles };

	// Check mana
	if (Mana.current[casterEid] < skill.manaCost) return { events, projectiles };

	// Get target for targeted skills
	const targetEid = Target.eid[casterEid];

	if (skill.type !== "self_buff" && skill.type !== "heal") {
		if (targetEid === 0) return { events, projectiles };
		if (hasComponent(world, Dead, targetEid)) return { events, projectiles };

		// Range check
		const dx = Position.x[targetEid] - Position.x[casterEid];
		const dz = Position.z[targetEid] - Position.z[casterEid];
		const distSq = dx * dx + dz * dz;
		if (distSq > skill.range * skill.range) return { events, projectiles };
	}

	// For heal, target is self (MVP — no ally targeting)
	const healTarget = casterEid;

	// Deduct mana and start cooldown
	Mana.current[casterEid] -= skill.manaCost;
	SkillCooldown[cdKey][casterEid] = skill.cooldown;

	// Execute skill
	switch (skill.type) {
		case "instant_melee": {
			const stat = getScaleStat(casterEid, skill.scaleStat);
			const rawPower = stat * skill.multiplier;
			const targetDef = CombatStats.defense[targetEid] ?? 0;
			const isCrit = Math.random() < CombatStats.critChance[casterEid];
			const damage = skill.isMagic
				? calculateMagicDamage(rawPower, targetDef, isCrit)
				: calculatePhysicalDamage(rawPower, targetDef, isCrit);

			Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);
			events.push({
				type: "damage",
				casterEid,
				targetEid,
				skillId,
				amount: damage,
				isCrit,
				remainingHp: Health.current[targetEid],
			});
			break;
		}
		case "ranged_projectile": {
			const stat = getScaleStat(casterEid, skill.scaleStat);
			const rawPower = stat * skill.multiplier;
			const targetDef = CombatStats.defense[targetEid] ?? 0;
			const armorPen = skill.armorPen ?? 0;
			const effectiveDef = targetDef * (1 - armorPen);
			const isCrit = Math.random() < CombatStats.critChance[casterEid];
			const critMult = classId === CLASS_ID.ASSASSIN ? 3.0 : 2.0;
			const damage = skill.isMagic
				? calculateMagicDamage(rawPower, effectiveDef, isCrit, critMult)
				: calculatePhysicalDamage(rawPower, effectiveDef, isCrit);

			// Spawn projectile entity
			const projEid = addEntity(world);
			addComponent(world, Position, projEid);
			addComponent(world, Projectile, projEid);
			addComponent(world, NetworkIdentity, projEid);

			NetworkIdentity.netId[projEid] = nextNetId();
			Position.x[projEid] = Position.x[casterEid];
			Position.y[projEid] = 1.0;
			Position.z[projEid] = Position.z[casterEid];

			Projectile.ownerEid[projEid] = casterEid;
			Projectile.targetEid[projEid] = targetEid;
			Projectile.speed[projEid] = 20;
			Projectile.damage[projEid] = damage;
			Projectile.isMagic[projEid] = skill.isMagic ? 1 : 0;
			Projectile.isCrit[projEid] = isCrit ? 1 : 0;
			Projectile.lifetime[projEid] = 3;

			projectiles.push({
				eid: projEid,
				ownerEid: casterEid,
				targetEid,
				speed: 20,
				type: skill.projectileType ?? "bolt",
			});
			break;
		}
		case "dash_melee": {
			// Teleport to target
			const dx = Position.x[targetEid] - Position.x[casterEid];
			const dz = Position.z[targetEid] - Position.z[casterEid];
			const dist = Math.sqrt(dx * dx + dz * dz);
			if (dist > 1) {
				// Move to 1 unit away from target
				const ratio = (dist - 1) / dist;
				Position.x[casterEid] += dx * ratio;
				Position.z[casterEid] += dz * ratio;
			}

			const stat = getScaleStat(casterEid, skill.scaleStat);
			const rawPower = stat * skill.multiplier;
			const targetDef = CombatStats.defense[targetEid] ?? 0;
			const armorPen = skill.armorPen ?? 0;
			const effectiveDef = targetDef * (1 - armorPen);
			const isCrit = Math.random() < CombatStats.critChance[casterEid];
			const damage = calculatePhysicalDamage(rawPower, effectiveDef, isCrit);

			Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage);
			events.push({
				type: "damage",
				casterEid,
				targetEid,
				skillId,
				amount: damage,
				isCrit,
				remainingHp: Health.current[targetEid],
			});
			break;
		}
		case "self_buff": {
			addComponent(world, Buff, casterEid);
			Buff.buffId[casterEid] = 1; // iron_will
			Buff.duration[casterEid] = skill.buffDuration ?? 8;
			Buff.magnitude[casterEid] = skill.buffMagnitude ?? 0.5;

			events.push({
				type: "buff",
				casterEid,
				targetEid: casterEid,
				skillId,
				amount: 0,
				isCrit: false,
			});
			break;
		}
		case "heal": {
			const stat = getScaleStat(casterEid, skill.scaleStat);
			const healAmount = Math.floor(stat * skill.multiplier);
			Health.current[healTarget] = Math.min(
				Health.max[healTarget],
				Health.current[healTarget] + healAmount,
			);

			events.push({
				type: "heal",
				casterEid,
				targetEid: healTarget,
				skillId,
				amount: healAmount,
				isCrit: false,
				remainingHp: Health.current[healTarget],
			});
			break;
		}
	}

	return { events, projectiles };
}

function getScaleStat(eid: number, stat: "str" | "int" | "dex"): number {
	switch (stat) {
		case "str":
			return CombatStats.attackPower[eid];
		case "int":
			return CombatStats.int[eid] * 2.5; // spellPower
		case "dex":
			return CombatStats.dex[eid] * 2.0 + CombatStats.attackPower[eid] * 0.5;
	}
}

/** Tick buff durations and remove expired buffs. */
export function buffTickSystem(_world: IWorld, _dt: number): number[] {
	// Simple: just check entities with Buff component
	// BitECS doesn't have a nice way to query by component presence for removal
	// so we track buff holders externally. For now, use casterEid list.
	return [];
}
