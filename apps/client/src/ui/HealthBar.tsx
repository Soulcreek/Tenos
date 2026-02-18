const barContainer = {
	width: "220px",
	height: "20px",
	background: "rgba(0,0,0,0.6)",
	"border-radius": "3px",
	overflow: "hidden",
	border: "1px solid rgba(255,255,255,0.15)",
} as const;

const labelStyle = {
	position: "absolute",
	width: "100%",
	"text-align": "center",
	color: "#fff",
	"font-size": "11px",
	"font-family": "monospace",
	"line-height": "20px",
	"text-shadow": "0 0 3px rgba(0,0,0,0.9)",
} as const;

export function HealthBar(props: { current: number; max: number }) {
	const pct = () => Math.max(0, Math.min(100, (props.current / props.max) * 100));

	return (
		<div style={{ ...barContainer, position: "relative" }}>
			<div
				style={{
					width: `${pct()}%`,
					height: "100%",
					background: pct() > 25 ? "#c0392b" : "#e74c3c",
					transition: "width 0.3s",
				}}
			/>
			<div style={labelStyle}>
				{props.current} / {props.max}
			</div>
		</div>
	);
}

export function ManaBar(props: { current: number; max: number }) {
	const pct = () => Math.max(0, Math.min(100, (props.current / props.max) * 100));

	return (
		<div style={{ ...barContainer, position: "relative" }}>
			<div
				style={{
					width: `${pct()}%`,
					height: "100%",
					background: "#2980b9",
					transition: "width 0.3s",
				}}
			/>
			<div style={labelStyle}>
				{props.current} / {props.max}
			</div>
		</div>
	);
}
