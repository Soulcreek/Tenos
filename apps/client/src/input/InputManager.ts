/**
 * Low-level input state manager. Tracks raw keyboard and mouse state.
 * Consumed by the InputSystem ECS system each frame.
 */
export class InputManager {
	/** Currently held keys (lowercase). */
	private keys = new Set<string>();
	/** Whether the input is suppressed (e.g. chat focused). */
	private suppressed = false;
	/** Mouse buttons currently held (0=left, 1=middle, 2=right). */
	private mouseButtons = new Set<number>();
	/** Last known mouse client position. */
	mouseX = 0;
	mouseY = 0;
	/** Left-click event consumed this frame. */
	leftClickThisFrame = false;
	/** Tab key pressed this frame. */
	tabPressedThisFrame = false;

	constructor(canvas: HTMLCanvasElement) {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		canvas.addEventListener("mousedown", this.onMouseDown);
		canvas.addEventListener("mouseup", this.onMouseUp);
		canvas.addEventListener("mousemove", this.onMouseMove);
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
	}

	// ── Public API ──────────────────────────────────────────────

	/** Normalized movement vector from WASD/arrow keys. Length <= 1. */
	getMovement(): { x: number; z: number } {
		if (this.suppressed) return { x: 0, z: 0 };

		let x = 0;
		let z = 0;

		if (this.keys.has("w") || this.keys.has("arrowup")) z += 1;
		if (this.keys.has("s") || this.keys.has("arrowdown")) z -= 1;
		if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
		if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;

		// Normalize diagonal movement
		const len = Math.sqrt(x * x + z * z);
		if (len > 1) {
			x /= len;
			z /= len;
		}

		return { x, z };
	}

	isJumpPressed(): boolean {
		return !this.suppressed && this.keys.has(" ");
	}

	isKeyDown(key: string): boolean {
		return !this.suppressed && this.keys.has(key.toLowerCase());
	}

	isMouseButtonDown(button: number): boolean {
		return this.mouseButtons.has(button);
	}

	/** Call once per frame to consume single-frame events. */
	resetFrameState(): void {
		this.leftClickThisFrame = false;
		this.tabPressedThisFrame = false;
	}

	/** Suppress all gameplay input (e.g. when chat input is focused). */
	setSuppressed(value: boolean): void {
		this.suppressed = value;
		if (value) this.keys.clear();
	}

	get isSuppressed(): boolean {
		return this.suppressed;
	}

	dispose(): void {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
	}

	// ── Event Handlers ──────────────────────────────────────────

	private onKeyDown = (e: KeyboardEvent): void => {
		// Ignore if an input element is focused (chat, etc.)
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

		const key = e.key.toLowerCase();
		this.keys.add(key);

		if (key === "tab") {
			e.preventDefault();
			this.tabPressedThisFrame = true;
		}
	};

	private onKeyUp = (e: KeyboardEvent): void => {
		this.keys.delete(e.key.toLowerCase());
	};

	private onMouseDown = (e: MouseEvent): void => {
		this.mouseButtons.add(e.button);
		if (e.button === 0) this.leftClickThisFrame = true;
	};

	private onMouseUp = (e: MouseEvent): void => {
		this.mouseButtons.delete(e.button);
	};

	private onMouseMove = (e: MouseEvent): void => {
		this.mouseX = e.clientX;
		this.mouseY = e.clientY;
	};
}
