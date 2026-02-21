import {
	CombatStats,
	Health,
	MAX_LEVEL,
	Mana,
	PendingXP,
	STAT_POINTS_PER_LEVEL,
	XP_TABLE,
	recalculateDerivedStats,
} from "@tenos/shared";
import { defineQuery, hasComponent, removeComponent } from "bitecs";
import type { IWorld } from "bitecs";

const pendingXPQuery = defineQuery([PendingXP, CombatStats]);

/** Event produced when XP is gained. */
export interface XPGainEvent {
	eid: number;
	amount: number;
	totalXP: number;
	xpToLevel: number;
}

/** Event produced when an entity levels up. */
export interface LevelUpEvent {
	eid: number;
	newLevel: number;
	statPoints: number;
	hpMax: number;
	mpMax: number;
}

/**
 * Processes PendingXP: adds XP, checks for level-ups, awards stat points.
 * Removes PendingXP component after processing.
 */
export function xpSystem(world: IWorld): { xpEvents: XPGainEvent[]; levelEvents: LevelUpEvent[] } {
	const xpEvents: XPGainEvent[] = [];
	const levelEvents: LevelUpEvent[] = [];
	const entities = pendingXPQuery(world);

	for (let i = 0; i < entities.length; i++) {
		const eid = entities[i];
		const amount = PendingXP.amount[eid];
		if (amount === 0) continue;

		CombatStats.xp[eid] += amount;
		PendingXP.amount[eid] = 0;
		removeComponent(world, PendingXP, eid);

		let currentLevel = CombatStats.level[eid];
		let leveled = false;

		// Check for level up(s)
		while (currentLevel < MAX_LEVEL) {
			const xpNeeded = XP_TABLE[currentLevel] ?? Number.MAX_SAFE_INTEGER;
			if (CombatStats.xp[eid] < xpNeeded) break;

			CombatStats.xp[eid] -= xpNeeded;
			currentLevel++;
			CombatStats.level[eid] = currentLevel;
			CombatStats.statPoints[eid] += STAT_POINTS_PER_LEVEL;
			leveled = true;
		}

		const xpToLevel = XP_TABLE[currentLevel] ?? 0;

		xpEvents.push({
			eid,
			amount,
			totalXP: CombatStats.xp[eid],
			xpToLevel,
		});

		if (leveled) {
			// Recalculate derived stats after level up
			const derived = recalculateDerivedStats(
				CombatStats.str[eid],
				CombatStats.dex[eid],
				CombatStats.int[eid],
				CombatStats.vit[eid],
				currentLevel,
			);

			// Update max HP/MP and heal to full on level up
			if (hasComponent(world, Health, eid)) {
				Health.max[eid] = derived.hpMax;
				Health.current[eid] = derived.hpMax;
				Health.regenRate[eid] = derived.hpRegen;
			}
			if (hasComponent(world, Mana, eid)) {
				Mana.max[eid] = derived.mpMax;
				Mana.current[eid] = derived.mpMax;
				Mana.regenRate[eid] = derived.mpRegen;
			}

			CombatStats.attackPower[eid] = derived.attackPower;
			CombatStats.defense[eid] = derived.defense;
			CombatStats.attackSpeed[eid] = derived.attackSpeed;
			CombatStats.critChance[eid] = derived.critChance;
			CombatStats.moveSpeed[eid] = derived.moveSpeed;

			levelEvents.push({
				eid,
				newLevel: currentLevel,
				statPoints: CombatStats.statPoints[eid],
				hpMax: derived.hpMax,
				mpMax: derived.mpMax,
			});
		}
	}

	return { xpEvents, levelEvents };
}
