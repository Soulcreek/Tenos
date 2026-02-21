const containerStyle = {
	position: "absolute",
	bottom: "0",
	left: "0",
	width: "100%",
	height: "6px",
	background: "rgba(0,0,0,0.6)",
	"pointer-events": "none",
} as const;

export function XPBar(props: { current: number; toLevel: number; level: number }) {
	const pct = () => {
		if (props.toLevel <= 0) return 100;
		return Math.max(0, Math.min(100, (props.current / props.toLevel) * 100));
	};

	return (
		<div style={containerStyle}>
			<div
				style={{
					width: `${pct()}%`,
					height: "100%",
					background: "linear-gradient(to right, #8e44ad, #9b59b6)",
					transition: "width 0.3s",
				}}
			/>
		</div>
	);
}
