import { For } from "solid-js";

const containerStyle = {
	position: "absolute",
	bottom: "50px",
	left: "20px",
	width: "300px",
	"max-height": "150px",
	overflow: "hidden",
	"pointer-events": "none",
	display: "flex",
	"flex-direction": "column-reverse",
} as const;

const lineStyle = {
	color: "rgba(255,255,255,0.7)",
	"font-family": "monospace",
	"font-size": "11px",
	"line-height": "1.4",
	"text-shadow": "0 0 3px rgba(0,0,0,0.9)",
} as const;

export function CombatLog(props: { messages: string[] }) {
	const recent = () => props.messages.slice(-15);

	return (
		<div style={containerStyle}>
			<For each={recent()}>{(msg) => <div style={lineStyle}>{msg}</div>}</For>
		</div>
	);
}
