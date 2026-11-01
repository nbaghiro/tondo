import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, signUpToEditor } from "./helpers";

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

const panel = (page: Page) => page.locator(".side");

async function add(page: Page, name: string, phone: boolean) {
    if (phone) await page.locator(".tabs .pill", { hasText: "Add" }).click();
    await page.locator(`.tile[aria-label="${name}"]`).click();
}

test("layouts are real thumbnails, and picking one changes the block", async ({ page }, info) => {
    await add(page, "Link card", info.project.name === "phone");
    const tiles = panel(page).locator(".var");
    await expect(tiles).toHaveCount(5);
    const hasContent = await tiles
        .first()
        .locator(".thumb-host")
        .evaluate((host) => Boolean(host.shadowRoot?.querySelector(".b-thumb")));
    expect(hasContent).toBe(true);
    await tiles.filter({ hasText: "Text over photo" }).click();
    await expect(canvas(page).locator(".b-f-over")).toHaveCount(1);
});

test("a pasted link is understood, and fills in empty words", async ({ page }, info) => {
    await add(page, "Button", info.project.name === "phone");
    const link = panel(page).getByRole("textbox", { name: "Link" });
    await link.fill("javascript:alert(1)");
    await expect(panel(page).locator(".lk-m.bad")).toBeVisible();
    await link.fill("instagram.com/maya");
    await expect(panel(page).locator(".lk-m.ok")).toContainText("Instagram");
    await expect(canvas(page).locator(".b-btn")).toHaveAttribute(
        "href",
        "https://instagram.com/maya",
    );
    await expect(canvas(page).locator(".b-btn")).toContainText("Find me on Instagram");
    await link.fill("maya@example.com");
    await expect(canvas(page).locator(".b-btn")).toHaveAttribute("href", "mailto:maya@example.com");
});

test("hiding a block dims it here, and says so in the panel", async ({ page }, info) => {
    await add(page, "Heading", info.project.name === "phone");
    await panel(page).locator("summary", { hasText: "Show or hide" }).click();
    await panel(page).getByRole("switch", { name: "Show on my page" }).click({ force: true });
    await expect(canvas(page).locator(".t-off .t-badge")).toHaveText("Hidden");
    await expect(panel(page).locator("summary small")).toHaveText("Hidden");
});

test("the toolbar moves, copies and deletes", async ({ page }, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Heading", phone);
    await panel(page).getByRole("button", { name: "Close" }).click();
    await add(page, "Button", phone);
    const blocks = canvas(page).locator("#t-blocks > .t-block");
    await expect(blocks).toHaveCount(2);
    const bar = page.locator(".block-actions");
    await bar.getByRole("button", { name: "Move up" }).click();
    await expect(blocks.first().locator(".b-btn")).toHaveCount(1);
    await bar.getByRole("button", { name: "Duplicate" }).click();
    await expect(blocks).toHaveCount(3);
    await bar.getByRole("button", { name: "Delete" }).click();
    await expect(blocks).toHaveCount(2);
});

test("the header has no empty placeholders until it's selected", async ({ page }) => {
    await expect(canvas(page).locator("#t-header .p-tag")).toBeHidden();
    await canvas(page).locator("#t-header h1").click();
    await expect(canvas(page).locator("#t-header .p-tag")).toBeVisible();
    await expect(panel(page).locator(".var")).toHaveCount(6);
});

test("a look with a signature header draws it, and a general layout replaces it", async ({
    page,
}, info) => {
    if (info.project.name === "phone")
        await page.locator(".tabs .pill", { hasText: "Look" }).click();
    await page.locator(".look-option", { hasText: "Surf" }).click();
    await expect(canvas(page).locator(".p-sun")).toHaveCount(1);
    if (info.project.name === "phone") await page.keyboard.press("Escape");
    await canvas(page).locator("#t-header h1").click();
    await panel(page).locator(".var", { hasText: "Centred" }).click();
    await expect(canvas(page).locator(".p-sun")).toHaveCount(0);
});

test("the gallery edits photos and captions", async ({ page }, info) => {
    await add(page, "Gallery", info.project.name === "phone");
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(6);
    await panel(page).getByRole("button", { name: "Photo 1." }).click();
    await panel(page).getByRole("button", { name: "Remove" }).click();
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(5);
    await panel(page).getByRole("button", { name: "Add photos" }).click();
    await panel(page).getByRole("button", { name: "Use photo man0" }).click();
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(6);
});

test("a link in the header sets its own icon", async ({ page }) => {
    await canvas(page).locator("#t-header h1").click();
    await panel(page).getByRole("button", { name: "Add a link" }).click();
    await panel(page).getByRole("textbox", { name: "Address" }).fill("instagram.com/maya");
    await expect(canvas(page).locator('#t-header [aria-label="instagram"]')).toHaveCount(1);
    await expect(panel(page).locator(".ls-n")).toHaveText("Instagram");
});

test("on a phone the sheet grows and closes from its grip", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "Phone only");
    await canvas(page).locator("#t-header h1").tap();
    const sheet = panel(page);
    await expect(sheet.locator(".i-head")).toBeVisible();
    const half = await sheet.boundingBox();
    await sheet.locator(".sheet-grip").click();
    await expect
        .poll(async () => (await sheet.boundingBox())?.height)
        .toBeGreaterThan(half?.height ?? 0);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(page.locator(".editor")).not.toHaveAttribute("data-sheet", "edit");
});

test("a new block's first field gets focus on a computer, and not on a phone", async ({
    page,
}, info) => {
    const phone = info.project.name === "phone";
    await add(page, "Heading", phone);
    const field = panel(page).getByRole("textbox", { name: "Heading" });
    if (phone) await expect(field).not.toBeFocused();
    else await expect(field).toBeFocused();
});
