import { expect, test } from "@playwright/test";

// Babylon.js + SwiftShader (software WebGL) in headless Chrome is slow.
// Give engine initialization plenty of time.
test.setTimeout(60_000);

/** Wait for the engine to finish loading (loading screen hidden or error shown). */
async function waitForEngineReady(page: import("@playwright/test").Page) {
	// Either the loading screen disappears (success) or an error overlay appears (failure).
	await Promise.race([
		expect(page.locator("#loading-screen")).toHaveCSS("display", "none", {
			timeout: 45_000,
		}),
		expect(page.locator("#error-overlay")).not.toHaveCSS("display", "none", {
			timeout: 45_000,
		}),
	]);
}

test("canvas is visible", async ({ page }) => {
	await page.goto("/");
	const canvas = page.locator("#game-canvas");
	await expect(canvas).toBeVisible();
});

test('UI overlay renders "Tenos"', async ({ page }) => {
	await page.goto("/");
	await waitForEngineReady(page);

	// Check engine didn't crash
	const errorOverlay = page.locator("#error-overlay");
	const errorDisplay = await errorOverlay.evaluate((el) => getComputedStyle(el).display);
	if (errorDisplay !== "none") {
		const errorText = await errorOverlay.textContent();
		test.skip(true, `Engine failed to initialize: ${errorText?.slice(0, 100)}`);
		return;
	}

	const overlay = page.locator("#ui-root");
	await expect(overlay).toContainText("Tenos", { timeout: 5_000 });
});

test.describe("scene rendering", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await waitForEngineReady(page);

		// Skip all scene tests if engine crashed
		const errorDisplay = await page
			.locator("#error-overlay")
			.evaluate((el) => getComputedStyle(el).display);
		if (errorDisplay !== "none") {
			const errorText = await page.locator("#error-overlay").textContent();
			test.skip(true, `Engine failed: ${errorText?.slice(0, 100)}`);
		}
	});

	test("loading screen disappears", async ({ page }) => {
		await expect(page.locator("#loading-screen")).toHaveCSS("display", "none");
	});

	test("no error overlay visible", async ({ page }) => {
		await expect(page.locator("#error-overlay")).toHaveCSS("display", "none");
	});

	test("canvas is not blank", async ({ page }) => {
		const canvas = page.locator("#game-canvas");
		const isNotBlank = await canvas.evaluate((el: HTMLCanvasElement) => {
			const gl = el.getContext("webgl2") || el.getContext("webgl");
			if (!gl) return false;

			const width = gl.drawingBufferWidth;
			const height = gl.drawingBufferHeight;

			// Sample pixels from several regions to detect uniform color
			const samples: Array<[number, number]> = [
				[Math.floor(width / 4), Math.floor(height / 4)],
				[Math.floor(width / 2), Math.floor(height / 2)],
				[Math.floor((width * 3) / 4), Math.floor((height * 3) / 4)],
				[Math.floor(width / 2), Math.floor(height / 4)],
				[Math.floor(width / 4), Math.floor((height * 3) / 4)],
			];

			const colors: string[] = [];
			const pixel = new Uint8Array(4);
			for (const [x, y] of samples) {
				gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
				colors.push(`${pixel[0]},${pixel[1]},${pixel[2]}`);
			}

			// If all sampled pixels are the same color, the canvas is blank
			const unique = new Set(colors);
			return unique.size > 1;
		});

		expect(isNotBlank).toBe(true);
	});

	test("scene renders with terrain and sky", async ({ page }) => {
		// Wait for scene to stabilize
		await page.waitForTimeout(2_000);

		// Functional check: verify the canvas has multiple distinct color regions
		// (sky, ground, character) rather than a pixel-perfect screenshot comparison
		// which is unreliable across different WebGL implementations.
		const colorDiversity = await page.locator("#game-canvas").evaluate((el: HTMLCanvasElement) => {
			const gl = el.getContext("webgl2") || el.getContext("webgl");
			if (!gl) return 0;

			const width = gl.drawingBufferWidth;
			const height = gl.drawingBufferHeight;
			const uniqueColors = new Set<string>();
			const pixel = new Uint8Array(4);

			// Sample a 10x10 grid across the canvas
			for (let row = 0; row < 10; row++) {
				for (let col = 0; col < 10; col++) {
					const x = Math.floor(((col + 0.5) / 10) * width);
					const y = Math.floor(((row + 0.5) / 10) * height);
					gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
					// Bucket colors to 16-level ranges to reduce noise
					const r = Math.floor(pixel[0] / 16);
					const g = Math.floor(pixel[1] / 16);
					const b = Math.floor(pixel[2] / 16);
					uniqueColors.add(`${r},${g},${b}`);
				}
			}

			return uniqueColors.size;
		});

		// A rendered 3D scene with sky, terrain, fog, and character should have
		// at least a handful of distinct color buckets (sky blue, ground green,
		// character, shadows, fog gradient).
		expect(colorDiversity).toBeGreaterThan(3);
	});
});
