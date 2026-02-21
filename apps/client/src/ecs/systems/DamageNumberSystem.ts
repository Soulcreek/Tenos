/**
 * Pooled HTML overlay floating damage numbers.
 * Colors: white (normal), yellow (crit), red (self-damage), green (heal).
 */

interface DamageNumber {
	element: HTMLDivElement;
	life: number;
	x: number;
	y: number;
	vy: number;
}

const POOL_SIZE = 20;
const LIFETIME = 1.5; // seconds
const FLOAT_SPEED = -60; // pixels per second (upward)

export function createDamageNumberSystem(container: HTMLElement) {
	const pool: DamageNumber[] = [];
	const active: DamageNumber[] = [];

	// Pre-create pool
	for (let i = 0; i < POOL_SIZE; i++) {
		const el = document.createElement("div");
		el.style.position = "absolute";
		el.style.pointerEvents = "none";
		el.style.fontFamily = "monospace";
		el.style.fontWeight = "bold";
		el.style.textShadow = "0 0 4px rgba(0,0,0,0.9)";
		el.style.whiteSpace = "nowrap";
		el.style.display = "none";
		el.style.zIndex = "1000";
		container.appendChild(el);
		pool.push({
			element: el,
			life: 0,
			x: 0,
			y: 0,
			vy: FLOAT_SPEED,
		});
	}

	return {
		/**
		 * Spawn a floating damage number at screen position.
		 * @param screenX - Screen X position
		 * @param screenY - Screen Y position
		 * @param amount - Damage amount
		 * @param type - "normal" | "crit" | "self" | "heal"
		 */
		spawn(
			screenX: number,
			screenY: number,
			amount: number,
			type: "normal" | "crit" | "self" | "heal" = "normal",
		): void {
			// Get from pool
			let entry = pool.pop();
			if (!entry) {
				// Recycle oldest active
				const recycled = active.shift();
				if (recycled) {
					entry = recycled;
				} else {
					return;
				}
			}

			entry.x = screenX;
			entry.y = screenY;
			entry.life = LIFETIME;
			entry.vy = FLOAT_SPEED;

			const el = entry.element;
			el.style.display = "block";
			el.style.left = `${screenX}px`;
			el.style.top = `${screenY}px`;
			el.style.opacity = "1";
			el.textContent = type === "heal" ? `+${amount}` : `-${amount}`;

			// Size and color
			switch (type) {
				case "crit":
					el.style.color = "#FFD700";
					el.style.fontSize = "22px";
					break;
				case "self":
					el.style.color = "#FF4444";
					el.style.fontSize = "16px";
					break;
				case "heal":
					el.style.color = "#44FF44";
					el.style.fontSize = "16px";
					break;
				default:
					el.style.color = "#FFFFFF";
					el.style.fontSize = "16px";
					break;
			}

			active.push(entry);
		},

		/** Update all active numbers. Call every frame. */
		update(dt: number): void {
			for (let i = active.length - 1; i >= 0; i--) {
				const entry = active[i];
				entry.life -= dt;
				entry.y += entry.vy * dt;

				const el = entry.element;
				el.style.top = `${entry.y}px`;
				el.style.opacity = String(Math.max(0, entry.life / LIFETIME));

				if (entry.life <= 0) {
					el.style.display = "none";
					active.splice(i, 1);
					pool.push(entry);
				}
			}
		},
	};
}
