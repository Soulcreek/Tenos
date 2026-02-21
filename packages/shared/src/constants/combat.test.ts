import { describe, expect, test } from "bun:test";
import {
	BASE_HP,
	BASE_MP,
	MIN_DAMAGE,
	calculatePhysicalDamage,
	calculateXPPenalty,
	recalculateDerivedStats,
} from "./combat.js";

describe("recalculateDerivedStats", () => {
	test("returns correct base stats for level 1 warrior", () => {
		const stats = recalculateDerivedStats(12, 8, 5, 10, 1);

		// hpMax = 100 + 10*10 + 1*5 = 205
		expect(stats.hpMax).toBe(205);
		// mpMax = 50 + 5*8 + 1*3 = 93
		expect(stats.mpMax).toBe(93);
		// attackPower = 12*2 + 1*1.5 = 25.5
		expect(stats.attackPower).toBeCloseTo(25.5, 1);
		// defense = 10*1.5 + 1*0.5 = 15.5
		expect(stats.defense).toBeCloseTo(15.5, 1);
		// critChance = 0.05 + 8*0.003 = 0.074
		expect(stats.critChance).toBeCloseTo(0.074, 3);
	});

	test("higher level increases derived stats", () => {
		const level1 = recalculateDerivedStats(10, 10, 10, 10, 1);
		const level10 = recalculateDerivedStats(10, 10, 10, 10, 10);

		expect(level10.hpMax).toBeGreaterThan(level1.hpMax);
		expect(level10.mpMax).toBeGreaterThan(level1.mpMax);
		expect(level10.attackPower).toBeGreaterThan(level1.attackPower);
	});

	test("critChance is capped at 0.5", () => {
		const stats = recalculateDerivedStats(10, 200, 10, 10, 1);
		expect(stats.critChance).toBe(0.5);
	});

	test("hpMax includes BASE_HP", () => {
		const stats = recalculateDerivedStats(0, 0, 0, 0, 1);
		expect(stats.hpMax).toBe(BASE_HP + 5); // BASE_HP + level*5
	});

	test("mpMax includes BASE_MP", () => {
		const stats = recalculateDerivedStats(0, 0, 0, 0, 1);
		expect(stats.mpMax).toBe(BASE_MP + 3); // BASE_MP + level*3
	});
});

describe("calculatePhysicalDamage", () => {
	test("returns at least MIN_DAMAGE", () => {
		// Very high defense, very low attack
		const damage = calculatePhysicalDamage(1, 10000, false);
		expect(damage).toBeGreaterThanOrEqual(MIN_DAMAGE);
	});

	test("zero defense produces damage close to attack power", () => {
		// With 0 defense, reduction = 0/(0+100) = 0, so damage ≈ attackPower
		const results: number[] = [];
		for (let i = 0; i < 100; i++) {
			results.push(calculatePhysicalDamage(100, 0, false));
		}
		const avg = results.reduce((a, b) => a + b, 0) / results.length;
		// Average should be around 100 (85-115% variance)
		expect(avg).toBeGreaterThan(80);
		expect(avg).toBeLessThan(120);
	});

	test("crit doubles damage approximately", () => {
		const normalResults: number[] = [];
		const critResults: number[] = [];
		for (let i = 0; i < 200; i++) {
			normalResults.push(calculatePhysicalDamage(100, 0, false));
			critResults.push(calculatePhysicalDamage(100, 0, true));
		}
		const avgNormal = normalResults.reduce((a, b) => a + b, 0) / normalResults.length;
		const avgCrit = critResults.reduce((a, b) => a + b, 0) / critResults.length;
		// Crit should be roughly 2x normal
		expect(avgCrit / avgNormal).toBeGreaterThan(1.8);
		expect(avgCrit / avgNormal).toBeLessThan(2.2);
	});

	test("defense reduces damage", () => {
		const lowDef: number[] = [];
		const highDef: number[] = [];
		for (let i = 0; i < 100; i++) {
			lowDef.push(calculatePhysicalDamage(100, 10, false));
			highDef.push(calculatePhysicalDamage(100, 100, false));
		}
		const avgLow = lowDef.reduce((a, b) => a + b, 0) / lowDef.length;
		const avgHigh = highDef.reduce((a, b) => a + b, 0) / highDef.length;
		expect(avgLow).toBeGreaterThan(avgHigh);
	});
});

describe("calculateXPPenalty", () => {
	test("reduces XP by 5% of level requirement", () => {
		const result = calculateXPPenalty(500, 1000);
		// penalty = floor(1000 * 0.05) = 50
		// result = 500 - 50 = 450
		expect(result).toBe(450);
	});

	test("XP cannot go below 0", () => {
		const result = calculateXPPenalty(10, 10000);
		expect(result).toBe(0);
	});

	test("zero XP stays at zero", () => {
		const result = calculateXPPenalty(0, 1000);
		expect(result).toBe(0);
	});
});
