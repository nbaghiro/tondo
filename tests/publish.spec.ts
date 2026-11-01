import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { addSection, canvas, panel, signUpToEditor } from "./helpers";

async function addButton(page: Page) {
    await addSection(page, "links");
    await expect(canvas(page).locator("a.b-btn").first()).toBeVisible();
}

const saved = (page: Page) => expect(page.locator(".status")).toHaveText("Saved");

test("a draft survives a reload, and stays private until published", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await addButton(page);
    await saved(page);
    await page.reload();
    await expect(canvas(page).locator("a.b-btn")).toHaveCount(3);
    const visitor = await page.context().browser()?.newContext({ userAgent: "Mozilla/5.0" });
    const other = await visitor?.newPage();
    const res = await other?.goto(new URL(`/${handle}`, page.url()).href);
    expect(res?.status()).toBe(404);
    await visitor?.close();
});

test("publishing checks the page, then it opens logged out and counts clicks", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await addButton(page);
    await panel(page).getByRole("textbox", { name: "Button text" }).fill("Shop");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await page.locator(".publish").click();
    await expect(page.locator(".pub-issues li").first()).toContainText('"Shop" needs a link');

    await page.locator(".pub-issues button").first().click();
    await panel(page).getByRole("textbox", { name: "Link" }).fill("shop.example.com");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await saved(page);
    await page.locator(".publish").click();
    await page.getByRole("button", { name: "Publish without these" }).click();
    await expect(panel(page).locator("h2")).toHaveText("Your page is live");
    await expect(page.locator(".publish")).toHaveText("Published");
    await page.keyboard.press("Escape");

    const visitor = await page.context().browser()?.newContext({ userAgent: "Mozilla/5.0" });
    const other = await visitor?.newPage();
    if (!other) throw new Error("No visitor page.");
    const url = new URL(`/${handle}`, page.url()).href;
    const res = await other.goto(url);
    expect(res?.status()).toBe(200);
    expect(res?.headers()["content-security-policy"]).toContain("default-src 'none'");
    await expect(other.locator(".t-block")).toHaveCount(0);
    const href = await other.locator("a.b-btn").getAttribute("href");
    expect(href).toMatch(new RegExp(`^/l/${handle}/`));

    const hit = await other.request.get(new URL(href ?? "", url).href, { maxRedirects: 0 });
    expect(hit.status()).toBe(302);
    expect(hit.headers()["location"]).toBe("https://shop.example.com");
    const made = await other.request.get(new URL(`/l/${handle}/nope`, url).href, {
        maxRedirects: 0,
    });
    expect(made.status()).toBe(404);
    await visitor?.close();

    // Counts are written in batches, so they arrive a moment later.
    const readStats = async () =>
        (await (await page.request.get("/api/v1/me/stats")).json()) as {
            views: number;
            clicks: number;
        };
    await expect.poll(async () => (await readStats()).clicks).toBe(1);
    expect((await readStats()).views).toBeGreaterThanOrEqual(1);

    // A later edit stays private until the next publish.
    await canvas(page).locator("a.b-btn").first().click();
    await panel(page).getByRole("textbox", { name: "Button text" }).fill("A new label");
    await expect(page.locator(".publish")).toHaveText("Publish");
});

test("a second tab can't overwrite newer work", async ({ page, context }) => {
    await signUpToEditor(page);
    const second = await context.newPage();
    await second.goto(page.url());
    await expect(second.locator(".address")).toBeVisible();
    await addButton(page);
    await saved(page);
    await addButton(second);
    await expect(second.locator(".status")).toHaveAttribute("data-state", "conflict");
    await expect(second.getByRole("button", { name: "Keep mine" })).toBeVisible();
    await second.close();
});

const ONE_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
);

test("an uploaded photo is cropped, saved and shown in the picker", async ({ page }) => {
    await signUpToEditor(page);
    await canvas(page).locator("#t-header").click();
    await panel(page).locator(".ph-empty").first().click();
    await page.locator(".upload input").setInputFiles({
        name: "me.png",
        mimeType: "image/png",
        buffer: ONE_PIXEL,
    });
    const image = canvas(page).locator("#t-header img");
    await expect(image).toHaveAttribute("src", /^\/photos\/uploads\/.+\.webp$/);
    const loaded = await image.evaluate((node) => (node as HTMLImageElement).naturalWidth);
    expect(loaded).toBe(1);

    await panel(page).locator(".ph .mini").first().click();
    await expect(page.locator(".pick-mine button")).toHaveCount(1);
    await page.locator(".upload input").setInputFiles({
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"),
    });
    await expect(page.locator(".picker .fd-e")).toContainText("JPEG, PNG or WebP");
});
