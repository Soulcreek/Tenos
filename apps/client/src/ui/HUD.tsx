import type { Engine } from "@babylonjs/core/Engines/engine";
import { createSignal, onCleanup } from "solid-js";
import type { EngineType } from "../engine/Engine.js";
import { DevOverlay } from "./DevOverlay.jsx";
import { HealthBar, ManaBar } from "./HealthBar.jsx";
import { Minimap } from "./Minimap.jsx";

export interface HUDState {
	getPlayerPos: () => { x: number; y: number; z: number };
	getPlayerCount: () => number;
	getHealth: () => { current: number; max: number };
	getMana: () => { current: number; max: number };
	getZoneName: () => string;
}

export function HUD(props: { engine: Engine; engineType: EngineType; state: HUDState }) {
	const [health, setHealth] = createSignal({ current: 100, max: 100 });
	const [mana, setMana] = createSignal({ current: 50, max: 50 });
	const [playerPos, setPlayerPos] = createSignal({ x: 0, y: 0, z: 0 });
	const [zoneName, setZoneName] = createSignal("Shinsoo Village");

	const interval = setInterval(() => {
		setHealth(props.state.getHealth());
		setMana(props.state.getMana());
		setPlayerPos(props.state.getPlayerPos());
		setZoneName(props.state.getZoneName());
	}, 250);

	onCleanup(() => clearInterval(interval));

	return (
		<>
			{/* Dev overlay (top-left) */}
			<DevOverlay
				engine={props.engine}
				engineType={props.engineType}
				getPlayerPos={props.state.getPlayerPos}
				getPlayerCount={props.state.getPlayerCount}
			/>

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
		</>
	);
}
