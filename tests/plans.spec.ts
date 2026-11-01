import { expect, test } from "@playwright/test";
import { canvas, panel, signUpToEditor } from "./helpers";

const ONE_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
);

test("a photo can be removed, and not while it's on the page", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await canvas(page).locator("#t-header").click();
    await panel(page).locator(".ph-empty").first().click();
    await page.locator(".upload input").setInputFiles({
        name: "me.png",
        mimeType: "image/png",
        buffer: ONE_PIXEL,
    });
    await expect(canvas(page).locator("#t-header img")).toHaveAttribute("src", /uploads/);
    await panel(page).locator(".ph .mini").first().click();
    await expect(page.locator(".photo-count")).toHaveText(/^\s*1 of 25\s*$/);

    await expect(page.locator(".saved.status")).toHaveAttribute("data-state", "saved");
    await page.locator(".mine-x").click();
    await expect(page.locator(".picker .fd-e")).toHaveText(
        "This photo is on your page. Take it off first.",
    );
    await expect(page.locator(".pick-mine .mine")).toHaveCount(1);
});

test("Free asks for 7 days of statistics at most", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    const answer = await page.evaluate(async () => {
        const res = await fetch("/api/v1/me/stats?days=90");
        return (await res.json()) as { range: number; days: unknown[] };
    });
    expect(answer.range).toBe(7);
    expect(answer.days).toHaveLength(7);
});
