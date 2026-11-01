import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, signUpToEditor } from "./helpers";

const desktopOnly = (name: string) => {
    test.skip(name === "phone", "Uses a mouse");
};

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

async function openShelf(page: Page, phone: boolean) {
    if (phone) await page.locator(".tabs .pill", { hasText: "Add" }).click();
}

test("adds a block, edits it in the panel, and undoes", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await openShelf(page, false);
    await page.locator('.tile[aria-label="Heading"]').click();
    const heading = canvas(page).locator("#t-blocks h2");
    await expect(heading).toHaveCount(1);
    const field = page.locator(".side input").first();
    await field.fill("Workshops");
    await expect(heading).toHaveText("Workshops");
    await page.locator('[aria-label="Undo"]').click();
    await expect(heading).not.toHaveText("Workshops");
});

test("edits text in place, and the panel follows", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.locator('.tile[aria-label="Heading"]').click();
    const heading = canvas(page).locator("#t-blocks h2");
    await expect(heading).toHaveClass(/./);
    await heading.click();
    await page.keyboard.type("Typed here");
    await expect(page.locator(".side input").first()).toHaveValue("Typed here");
    await page.keyboard.press("Enter");
    await expect(heading).toHaveText("Typed here");
});

test("moves blocks by dragging on the canvas", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.locator('.tile[aria-label="Heading"]').click();
    await page.locator('.tile[aria-label="Button"]').click();
    await page.keyboard.press("Escape");
    const blocks = canvas(page).locator("#t-blocks > .t-block");
    await expect(blocks).toHaveCount(2);
    await expect(blocks.first().locator("h2")).toHaveCount(1);
    const from = await blocks.first().boundingBox();
    const to = await blocks.last().boundingBox();
    if (!from || !to) throw new Error("The blocks have no size.");
    await page.mouse.move(from.x + 40, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + 40, to.y + to.height - 2, { steps: 12 });
    await page.mouse.up();
    await expect(blocks.last().locator("h2")).toHaveCount(1);
});

test("the delete key removes the selected block", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.locator('.tile[aria-label="Heading"]').click();
    await page.keyboard.press("Escape");
    const heading = canvas(page).locator("#t-blocks h2");
    await heading.click();
    await page.keyboard.press("Delete");
    await expect(heading).toHaveCount(0);
});

test("the draft survives a reload", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await page.locator('.tile[aria-label="Heading"]').click();
    await page.locator(".side input").first().fill("Still here");
    await page.reload();
    await expect(canvas(page).locator("#t-blocks h2")).toHaveText("Still here");
});

test("on a phone, tapping a block opens the sheet with the block still in view", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "phone", "Phone only");
    await openShelf(page, true);
    await page.locator('.tile[aria-label="Heading"]').tap();
    await expect(page.locator(".side input").first()).toBeVisible();
    await expect(canvas(page).locator("#t-blocks h2")).toBeInViewport();
});
