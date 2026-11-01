import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, signUpToEditor } from "./helpers";

async function addButton(page: Page, phone: boolean) {
    if (phone) await page.locator(".tabs .pill", { hasText: "Add" }).click();
    await page.locator('.tile[aria-label="Button"]').click();
    await expect(canvas(page).locator("a.b-btn")).toHaveCount(1);
}

const saved = (page: Page) => expect(page.locator(".status")).toHaveText("Saved");

test("a draft survives a reload, and stays private until published", async ({ page }, info) => {
    const handle = await signUpToEditor(page);
    await addButton(page, info.project.name === "phone");
    await saved(page);
    await page.reload();
    await expect(canvas(page).locator("a.b-btn")).toHaveCount(1);
    const visitor = await page.context().browser()?.newContext();
    const other = await visitor?.newPage();
    const res = await other?.goto(new URL(`/${handle}`, page.url()).href);
    expect(res?.status()).toBe(404);
    await visitor?.close();
});

test("publishing checks the page, then it opens logged out and counts clicks", async ({
    page,
}, info) => {
    const handle = await signUpToEditor(page);
    const phone = info.project.name === "phone";
    await addButton(page, phone);
    await page.locator(".publish").click();
    await expect(page.locator(".pub-issues li")).toContainText("needs a link");

    await page.locator(".pub-issues button").click();
    await page.locator(".side input.in").first().fill("shop.example.com");
    await page.locator('.side .i-head [aria-label="Close"]').click();
    await saved(page);
    await page.locator(".publish").click();
    await expect(page.locator(".pub h2")).toHaveText("Your page is live");
    await expect(page.locator(".publish")).toHaveText("Published");
    await page.keyboard.press("Escape");

    const visitor = await page.context().browser()?.newContext();
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

    const stats = (await (await page.request.get("/api/v1/me/stats")).json()) as {
        views: number;
        clicks: number;
    };
    expect(stats.clicks).toBe(1);
    expect(stats.views).toBeGreaterThanOrEqual(1);

    // A later edit stays private until the next publish.
    await canvas(page).locator("a.b-btn").click();
    await page.locator(".side .in").nth(1).fill("A new label");
    await expect(page.locator(".publish")).toHaveText("Publish");
});

test("a second tab can't overwrite newer work", async ({ page, context }, info) => {
    await signUpToEditor(page);
    const phone = info.project.name === "phone";
    const second = await context.newPage();
    await second.goto(page.url());
    await expect(second.locator(".address")).toBeVisible();
    await addButton(page, phone);
    await saved(page);
    await addButton(second, phone);
    await expect(second.locator(".status")).toHaveAttribute("data-state", "conflict");
    await expect(second.locator(".status-reload")).toBeVisible();
    await second.close();
});
