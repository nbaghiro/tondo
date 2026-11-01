import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, signUpToEditor } from "./helpers";

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

async function add(page: Page, name: string, phone: boolean) {
    if (phone)
        await page.locator('.tabs .pill:visible:has-text("Add"), .i-add:visible').first().click();
    await page.locator(`.tile[aria-label="${name}"]`).click();
}

test("blocks go into the chosen tab, and stay there", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Tabs", phone);
    const frame = canvas(page);
    await expect(frame.locator(".b-tabbar label")).toHaveCount(2);
    await frame.locator(".b-tabbar label").nth(1).click();
    await expect(frame.locator(".b-panel.p1 .t-tab-empty")).toBeVisible();
    await add(page, "Heading", phone);
    await expect(frame.locator(".b-panel.p1 h2")).toHaveCount(1);
    await expect(frame.locator(".b-panel.p1 h2")).toBeVisible();
    await expect(frame.locator(".b-panel.p0 h2")).toHaveCount(0);

    // Editing a block inside a tab keeps that tab open.
    await page.locator(".side input.in").first().fill("Inside a tab");
    await expect(frame.locator(".b-panel.p1 h2")).toHaveText("Inside a tab");
    await expect(frame.locator(".b-panel.p1 h2")).toBeVisible();

    await page.locator('[aria-label="Undo"]').click();
    await expect(frame.locator(".b-panel.p1 h2")).not.toHaveText("Inside a tab");
});

test("tabs can't go inside tabs", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Tabs", phone);
    await add(page, "Heading", phone);
    await add(page, "Tabs", phone);
    await expect(canvas(page).locator("#t-blocks > .t-block .b-tabs")).toHaveCount(2);
    await expect(canvas(page).locator(".b-panel .b-tabs")).toHaveCount(0);
});

test("moving up and down works inside a tab", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Tabs", phone);
    await add(page, "Heading", phone);
    await page.locator(".side input.in").first().fill("First");
    await add(page, "Button", phone);
    await page.locator('.block-actions [aria-label="Move up"]').click();
    const words = canvas(page).locator(".b-panel.p0 .t-block");
    await expect(words.first()).toContainText("Visit my shop");
});

test("a pasted link becomes the right block", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    if (phone) await page.locator(".tabs .pill", { hasText: "Add" }).click();
    const box = page.locator(".paste-box input");
    await box.fill("not a link");
    await page.locator(".paste-box button").click();
    await expect(page.locator(".paste small")).toBeVisible();
    await box.fill("youtube.com/watch?v=abc");
    await page.locator(".paste-box button").click();
    await expect(canvas(page).locator(".b-video")).toHaveCount(1);
    await page.keyboard.press("Escape");
    if (phone) await page.locator(".tabs .pill", { hasText: "Add" }).click();
    await box.fill("hello@example.com");
    await page.locator(".paste-box button").click();
    await expect(canvas(page).locator("a.b-btn").last()).toHaveAttribute(
        "href",
        "mailto:hello@example.com",
    );
});

test("preview shows the page as visitors see it, and comes back", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Heading", phone);
    await page.keyboard.press("Escape");
    await (
        phone ? page.locator(".tabs .pill", { hasText: "Preview" }) : page.locator(".preview-open")
    ).click();
    const shown = page.frameLocator(".preview iframe");
    await expect(shown.locator("h2")).toHaveCount(1);
    await expect(shown.locator(".t-block")).toHaveCount(0);
    await page.locator(".preview-back").click();
    await expect(page.locator(".preview")).toHaveCount(0);
});
