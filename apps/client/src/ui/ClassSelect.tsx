import { For, createSignal } from "solid-js";

interface ClassSelectProps {
	onSelect: (characterClass: string) => void;
}

const CLASS_INFO = [
	{
		id: "warrior",
		name: "Warrior",
		icon: "\u2694",
		color: "#c44",
		desc: "Melee specialist. High defense and powerful strikes.",
		skills: "Cleave \u2022 Iron Will",
	},
	{
		id: "magician",
		name: "Magician",
		icon: "\u2728",
		color: "#44c",
		desc: "Master of arcane arts. Ranged spells and healing.",
		skills: "Arcane Bolt \u2022 Mend",
	},
	{
		id: "assassin",
		name: "Assassin",
		icon: "\ud83c\udff9",
		color: "#4a4",
		desc: "Swift and deadly. Ranged and melee hybrid.",
		skills: "Piercing Shot \u2022 Shadow Strike",
	},
];

export function ClassSelect(props: ClassSelectProps) {
	const [selected, setSelected] = createSignal<string | null>(null);

	const handleConfirm = () => {
		const sel = selected();
		if (sel) props.onSelect(sel);
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: "0",
				background: "rgba(0,0,0,0.85)",
				display: "flex",
				"flex-direction": "column",
				"align-items": "center",
				"justify-content": "center",
				"z-index": "1000",
				"font-family": "monospace",
				color: "white",
			}}
		>
			<h1 style={{ "font-size": "28px", "margin-bottom": "8px", "letter-spacing": "2px" }}>
				Choose Your Class
			</h1>
			<p style={{ color: "rgba(255,255,255,0.5)", "margin-bottom": "32px", "font-size": "12px" }}>
				This choice is permanent for this character
			</p>

			<div style={{ display: "flex", gap: "20px" }}>
				<For each={CLASS_INFO}>
					{(cls) => (
						<div
							onClick={() => setSelected(cls.id)}
							style={{
								width: "200px",
								padding: "24px 16px",
								background: selected() === cls.id ? `${cls.color}33` : "rgba(255,255,255,0.05)",
								border: `2px solid ${selected() === cls.id ? cls.color : "rgba(255,255,255,0.15)"}`,
								"border-radius": "8px",
								cursor: "pointer",
								"text-align": "center",
								transition: "all 0.15s",
							}}
						>
							<div style={{ "font-size": "48px", "margin-bottom": "12px" }}>{cls.icon}</div>
							<div
								style={{
									"font-size": "18px",
									"font-weight": "bold",
									color: cls.color,
									"margin-bottom": "8px",
								}}
							>
								{cls.name}
							</div>
							<div
								style={{
									"font-size": "12px",
									color: "rgba(255,255,255,0.7)",
									"margin-bottom": "12px",
									"line-height": "1.4",
								}}
							>
								{cls.desc}
							</div>
							<div
								style={{
									"font-size": "10px",
									color: "rgba(255,255,255,0.4)",
									"border-top": "1px solid rgba(255,255,255,0.1)",
									"padding-top": "8px",
								}}
							>
								{cls.skills}
							</div>
						</div>
					)}
				</For>
			</div>

			{selected() && (
				<button
					onClick={handleConfirm}
					style={{
						"margin-top": "24px",
						padding: "10px 40px",
						background: CLASS_INFO.find((c) => c.id === selected())?.color ?? "#555",
						color: "white",
						border: "none",
						"border-radius": "4px",
						"font-family": "monospace",
						"font-size": "14px",
						cursor: "pointer",
						"font-weight": "bold",
					}}
				>
					Enter as {CLASS_INFO.find((c) => c.id === selected())?.name}
				</button>
			)}
		</div>
	);
}
