import type { Engine } from "@babylonjs/core/Engines/engine";
import { createSignal, onCleanup } from "solid-js";
import type { EngineType } from "../engine/Engine.js";

const style = {
	position: "absolute",
	top: "12px",
	left: "12px",
	color: "#fff",
	"font-family": "monospace",
	"font-size": "12px",
	"text-shadow": "0 0 4px rgba(0,0,0,0.8)",
	"pointer-events": "none",
	"line-height": "1.6",
} as const;

export function DevOverlay(props: {
	engine: Engine;
	engineType: EngineType;
	getPlayerPos: () => { x: number; y: number; z: number };
	getPlayerCount: () => number;
}) {
	const [fps, setFps] = createSignal(0);
	const [pos, setPos] = createSignal({ x: 0, y: 0, z: 0 });
	const [count, setCount] = createSignal(0);

	const interval = setInterval(() => {
		setFps(Math.round(props.engine.getFps()));
		setPos(props.getPlayerPos());
		setCount(props.getPlayerCount());
	}, 250);

	onCleanup(() => clearInterval(interval));

	return (
		<div style={style}>
			<div>Tenos v0.1.0 | {props.engineType.toUpperCase()}</div>
			<div>{fps()} FPS</div>
			<div>
				Pos: {pos().x.toFixed(1)}, {pos().y.toFixed(1)}, {pos().z.toFixed(1)}
			</div>
			<div>Players: {count()}</div>
		</div>
	);
}
