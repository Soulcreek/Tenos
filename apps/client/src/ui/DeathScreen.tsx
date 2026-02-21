const overlayStyle = {
	position: "absolute",
	top: "0",
	left: "0",
	width: "100%",
	height: "100%",
	background: "rgba(0,0,0,0.7)",
	display: "flex",
	"flex-direction": "column",
	"justify-content": "center",
	"align-items": "center",
	"z-index": "100",
	"pointer-events": "none",
} as const;

const titleStyle = {
	color: "#e74c3c",
	"font-family": "monospace",
	"font-size": "36px",
	"font-weight": "bold",
	"text-shadow": "0 0 20px rgba(231,76,60,0.5)",
	"margin-bottom": "16px",
} as const;

const infoStyle = {
	color: "#ccc",
	"font-family": "monospace",
	"font-size": "14px",
	"margin-bottom": "8px",
} as const;

export function DeathScreen(props: { respawnTimer: number; xpLost: number }) {
	return (
		<div style={overlayStyle}>
			<div style={titleStyle}>YOU ARE DEAD</div>
			<div style={infoStyle}>XP Lost: {props.xpLost}</div>
			<div style={infoStyle}>Respawning in {Math.max(0, Math.ceil(props.respawnTimer))}s...</div>
		</div>
	);
}
