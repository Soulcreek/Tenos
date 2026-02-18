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
