import type { Engine } from "@babylonjs/core/Engines/engine";
import { createSignal, onCleanup } from "solid-js";
import type { EngineType } from "../engine/Engine.js";
import { CombatLog } from "./CombatLog.jsx";
import { DeathScreen } from "./DeathScreen.jsx";
import { DevOverlay } from "./DevOverlay.jsx";
import { HealthBar, ManaBar } from "./HealthBar.jsx";
import { LootPopup } from "./LootPopup.jsx";
import { Minimap } from "./Minimap.jsx";
import { StatPanel } from "./StatPanel.jsx";
import { TargetFrame } from "./TargetFrame.jsx";
import { XPBar } from "./XPBar.jsx";

export interface HUDState {
	getPlayerPos: () => { x: number; y: number; z: number };
	getPlayerCount: () => number;
	getHealth: () => { current: number; max: number };
	getMana: () => { current: number; max: number };
	getZoneName: () => string;
	getLevel: () => number;
	getXP: () => { current: number; toLevel: number };
	getTarget: () => {
		name: string;
		typeId: number;
		hp: number;
		hpMax: number;
		level: number;
	} | null;
	getIsDead: () => boolean;
	getRespawnTimer: () => number;
	getXPLost: () => number;
	getCombatLog: () => string[];
	getLootPopups: () => Array<{ name: string; qty: number; time: number }>;
	getPlayerStats: () => {
		str: number;
		dex: number;
		int: number;
		vit: number;
		statPoints: number;
		attackPower: number;
		defense: number;
		attackSpeed: number;
		critChance: number;
		moveSpeed: number;
	};
	allocateStat: (stat: "str" | "dex" | "int" | "vit") => void;
}

export function HUD(props: { engine: Engine; engineType: EngineType; state: HUDState }) {
	const [health, setHealth] = createSignal({ current: 100, max: 100 });
	const [mana, setMana] = createSignal({ current: 50, max: 50 });
	const [playerPos, setPlayerPos] = createSignal({ x: 0, y: 0, z: 0 });
	const [zoneName, setZoneName] = createSignal("Shinsoo Village");
	const [level, setLevel] = createSignal(1);
	const [xp, setXp] = createSignal({ current: 0, toLevel: 100 });
	const [target, setTarget] = createSignal<ReturnType<HUDState["getTarget"]>>(null);
	const [isDead, setIsDead] = createSignal(false);
	const [respawnTimer, setRespawnTimer] = createSignal(0);
	const [xpLost, setXpLost] = createSignal(0);
	const [combatLog, setCombatLog] = createSignal<string[]>([]);
	const [lootPopups, setLootPopups] = createSignal<
		Array<{ name: string; qty: number; time: number }>
	>([]);
	const [stats, setStats] = createSignal(props.state.getPlayerStats());
	const [showStats, setShowStats] = createSignal(false);

	const interval = setInterval(() => {
		setHealth(props.state.getHealth());
		setMana(props.state.getMana());
		setPlayerPos(props.state.getPlayerPos());
		setZoneName(props.state.getZoneName());
		setLevel(props.state.getLevel());
		setXp(props.state.getXP());
		setTarget(props.state.getTarget());
		setIsDead(props.state.getIsDead());
		setRespawnTimer(props.state.getRespawnTimer());
		setXpLost(props.state.getXPLost());
		setCombatLog([...props.state.getCombatLog()]);
		setLootPopups([...props.state.getLootPopups()]);
		setStats(props.state.getPlayerStats());
	}, 100);

	// Toggle stat panel with 'C' key
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key.toLowerCase() === "c") {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			setShowStats((prev) => !prev);
		}
	};
	window.addEventListener("keydown", onKeyDown);

	onCleanup(() => {
		clearInterval(interval);
		window.removeEventListener("keydown", onKeyDown);
	});

	return (
		<>
			{/* Dev overlay (top-left) */}
			<DevOverlay
				engine={props.engine}
				engineType={props.engineType}
				getPlayerPos={props.state.getPlayerPos}
				getPlayerCount={props.state.getPlayerCount}
			/>

			{/* Target frame (top-center) */}
			<TargetFrame target={target()} />

			{/* Health & Mana (bottom-left) */}
			<div
				style={{
					position: "absolute",
					bottom: "20px",
					left: "20px",
					display: "flex",
					"flex-direction": "column",
					gap: "4px",
					"pointer-events": "none",
				}}
			>
				<HealthBar current={health().current} max={health().max} />
				<ManaBar current={mana().current} max={mana().max} />
				<div
					style={{
						color: "rgba(255,255,255,0.6)",
						"font-family": "monospace",
						"font-size": "10px",
						"text-shadow": "0 0 3px rgba(0,0,0,0.8)",
					}}
				>
					Lv.{level()}
				</div>
			</div>

			{/* Minimap (top-right) */}
			<div
				style={{
					position: "absolute",
					top: "12px",
					right: "12px",
					"pointer-events": "none",
				}}
			>
				<Minimap playerX={playerPos().x} playerZ={playerPos().z} zoneName={zoneName()} />
			</div>

			{/* XP Bar (bottom of screen) */}
			<XPBar current={xp().current} toLevel={xp().toLevel} level={level()} />

			{/* Combat Log (bottom-left, above health bars) */}
			<CombatLog messages={combatLog()} />

			{/* Loot Popups (right side) */}
			<LootPopup items={lootPopups()} />

			{/* Stat Panel (toggle with C) */}
			{showStats() && (
				<StatPanel
					stats={stats()}
					level={level()}
					onAllocate={props.state.allocateStat}
					onClose={() => setShowStats(false)}
				/>
			)}

			{/* Death Screen */}
			{isDead() && <DeathScreen respawnTimer={respawnTimer()} xpLost={xpLost()} />}
		</>
	);
}
