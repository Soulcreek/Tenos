import { expect, test } from "@playwright/test";

test("canvas is visible", async ({ page }) => {
	await page.goto("/");
	const canvas = page.locator("#game-canvas");
	await expect(canvas).toBeVisible();
});

test('UI overlay renders "Tenos"', async ({ page }) => {
	await page.goto("/");
	const overlay = page.locator("#ui-root");
	await expect(overlay).toContainText("Tenos");
});

test.describe("scene rendering", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#loading-screen")).toHaveCSS("display", "none", {
			timeout: 15_000,
		});
	});

	test("loading screen disappears", async ({ page }) => {
		// beforeEach already asserts this — if we reach here, loading finished
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

	test("scene renders correctly", async ({ page }) => {
		// Extra wait for terrain, shadows, and scene to stabilize
		await page.waitForTimeout(2_000);
		await expect(page).toHaveScreenshot("scene-loaded.png");
	});
});
