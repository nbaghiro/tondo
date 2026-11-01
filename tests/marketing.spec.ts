import { expect, test } from "@playwright/test";

test.describe("the gallery", () => {
    test("shows every example page, drawn by the real renderer", async ({ page }) => {
        await page.goto("/gallery");
        await expect(page.locator(".exgrid .ex")).toHaveCount(50);
        await page.goto("/mayaokafor");
        await expect(page.locator("h1")).toHaveText("Maya Okafor");
        await expect(page.locator(".b-feature, .b-f-large").first()).toBeVisible();
        const broken = await page.evaluate(async () => {
            const images = [...document.images];
            await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
            return images.filter((image) => !image.naturalWidth).map((image) => image.src);
        });
        expect(broken).toEqual([]);
    });

    test("addresses are lowercase, whatever someone types", async ({ request }) => {
        const res = await request.get("/MayaOkafor", { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(res.headers()["location"]).toBe("/mayaokafor");
    });

    test("the filmstrip can be paused", async ({ page }) => {
        await page.goto("/");
        const position = () =>
            page.locator(".ex-track").evaluate((track) => getComputedStyle(track).transform);
        const pause = page.locator("[data-pause]");
        await pause.scrollIntoViewIfNeeded();
        await pause.click();
        await expect(pause).toHaveText("Play");
        await page.waitForTimeout(1500);
        const stopped = await position();
        await page.waitForTimeout(500);
        expect(await position()).toBe(stopped);
    });

    test("the blocks section uses real blocks", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".bk")).toHaveCount(9);
        await expect(page.locator(".bk-in .b-player")).toHaveCount(1);
    });
});

test("example pages keep everything, even words that match a section's sample", async ({
    page,
}) => {
    // Their words were the source of some samples, and they're drawn in full, never as "live".
    await page.goto("/mayaokafor");
    await expect(page.locator("main")).toContainText("Tall ash vase");
    await page.goto("/harbourbakery");
    await expect(page.locator("main")).toContainText("Tue to Fri");
});
