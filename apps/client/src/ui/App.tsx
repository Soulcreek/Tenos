import type { Engine } from "@babylonjs/core/Engines/engine";
import { createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";

function App(props: { engine: Engine }) {
	const [fps, setFps] = createSignal(0);

	const interval = setInterval(() => {
		setFps(Math.round(props.engine.getFps()));
	}, 100);

	onCleanup(() => clearInterval(interval));

	return (
		<div
			style={{
				position: "absolute",
				top: "12px",
				left: "12px",
				color: "#fff",
				"font-family": "monospace",
				"font-size": "14px",
				"text-shadow": "0 0 4px rgba(0,0,0,0.8)",
				"pointer-events": "none",
			}}
		>
			<div>Tenos v0.1.0</div>
			<div>{fps()} FPS</div>
		</div>
	);
}

export function initUI(root: HTMLElement, engine: Engine) {
	render(() => <App engine={engine} />, root);
}
