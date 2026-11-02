import { expect, test } from "@playwright/test";
import { addSection, canvas, openPreview, openSections, panel, signUpToEditor } from "./helpers";

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

test("sections go into the chosen tab, and stay there", async ({ page }) => {
    await addSection(page, "tabs");
    const frame = canvas(page);
    await expect(frame.locator(".b-tabbar label")).toHaveCount(2);
    await frame.locator(".b-tabbar label").nth(1).click();
    await expect(frame.locator(".b-panel.p1 .t-tab-empty")).toBeVisible();
    await addSection(page, "about");
    await expect(frame.locator(".b-panel.p1 h2")).toHaveCount(1);
    await expect(frame.locator(".b-panel.p1 h2")).toBeVisible();
    await expect(frame.locator(".b-panel.p0 h2")).toHaveCount(0);

    // Editing something inside a tab keeps that tab open.
    await panel(page).getByLabel("Title above it (optional)").fill("Inside a tab");
    await expect(frame.locator(".b-panel.p1 h2")).toHaveText("Inside a tab");
    await expect(frame.locator(".b-panel.p1 h2")).toBeVisible();

    await page.locator('[aria-label="Undo"]').click();
    await expect(frame.locator(".b-panel.p1 h2")).not.toHaveText("Inside a tab");
});

test("tabs can't go inside tabs", async ({ page }) => {
    await addSection(page, "tabs");
    await addSection(page, "about");
    await addSection(page, "tabs");
    await expect(canvas(page).locator("#t-blocks .b-tabs")).toHaveCount(2);
    await expect(canvas(page).locator(".b-panel .b-tabs")).toHaveCount(0);
});

test("moving up and down works inside a tab", async ({ page }) => {
    await addSection(page, "tabs");
    await addSection(page, "about");
    await addSection(page, "links");
    await canvas(page).locator('#t-tools [data-t="up"]').click();
    const inside = canvas(page).locator(".b-panel.p0 .t-block");
    await expect(inside.first()).toContainText("My website");
});

test("a pasted link becomes the right section", async ({ page }) => {
    await openSections(page);
    const box = page.locator("#q");
    await box.fill("not a link at all");
    await expect(page.locator(".hint-box")).toBeVisible();
    await box.fill("youtube.com/watch?v=abc");
    await page.locator("[data-route]").click();
    await expect(canvas(page).locator(".b-video")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await openSections(page);
    await box.fill("hello@example.com");
    await page.locator("[data-route]").click();
    await expect(canvas(page).locator('a[href="mailto:hello@example.com"]')).toHaveCount(1);
});

test("preview shows the page with its sample content, and comes back", async ({ page }) => {
    await addSection(page, "links");
    await page.keyboard.press("Escape");
    await addSection(page, "about");
    await panel(page).locator("textarea").first().fill("My own words about my work.");
    await page.keyboard.press("Escape");
    await openPreview(page);
    const shown = page.frameLocator(".preview iframe");
    await expect(shown.locator("h2")).toHaveCount(1);
    await expect(shown.locator("a.b-btn").first()).toContainText("My website");
    await page.locator(".preview-back").click();
    await expect(page.locator(".preview")).toHaveCount(0);
    await openPreview(page);
    await page.keyboard.press("Escape");
    await expect(page.locator(".preview")).toHaveCount(0);
});
