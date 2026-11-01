import { expect, test } from "@playwright/test";
import { canvas, finishStart, signUpToEditor, signUpToStart } from "./helpers";

test("the start flow builds the page, step by step, with the address from the marketing box", async ({
    page,
}, info) => {
    const handle = `s${Date.now().toString(36)}${info.project.name[0] ?? ""}`;
    await signUpToStart(page, handle);
    await expect(page.locator("[data-next]")).toBeDisabled();
    await page.locator("#start-name").fill("Tide Bakery");
    await page.locator(".chip", { hasText: "A shop" }).click();
    await page.locator("[data-next]").click();

    await expect(page.locator(".check[data-id=shop]")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".check[data-id=photos]")).toHaveAttribute("aria-checked", "false");
    await page.locator("[data-next]").click();

    await page.locator(".mark-t[data-mark=poster]").click();
    await page.locator("[data-next]").click();

    await page.locator(".tile[data-look=noir]").click();
    await page.locator("[data-next]").click();

    await expect(page.locator("#start-handle")).toHaveValue(handle);
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();

    await expect(page.locator(".address")).toContainText(handle);
    const frame = canvas(page);
    await expect(frame.locator("html")).toHaveClass(/noir/);
    await expect(frame.locator("#t-header h1")).toHaveAttribute("aria-label", "Tide Bakery");
    await expect(frame.locator("#t-header .wm-poster")).toHaveCount(1);
    await expect(frame.locator("#t-blocks > section.t-s").first().locator(".b-btn")).toHaveCount(3);

    // Coming back goes straight to the editor.
    await page.reload();
    await expect(page.locator(".address")).toContainText(handle);
    await expect(page.locator("#start-name")).toHaveCount(0);
});

test("an address that's taken or reserved can't be used, and another can", async ({
    page,
    browser,
}) => {
    const taken = await signUpToEditor(page);
    const other = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const second = await other.newPage();
    const handle = await signUpToStart(second);
    await second.locator("#start-name").fill("Rae");
    for (let i = 0; i < 4; i++) await second.locator("[data-next]").click();
    const box = second.locator("#start-handle");
    const note = second.locator("#start-note");
    await box.fill(taken);
    await expect(note).toHaveClass(/bad/);
    await expect(second.locator("[data-next]")).toBeDisabled();
    await box.fill("login");
    await expect(note).toHaveClass(/bad/);
    await box.fill(handle);
    await expect(note).toHaveClass(/ok/);
    await second.locator("[data-next]").click();
    await expect(second.locator(".address")).toContainText(handle);
    await other.close();
});

test("the helper's plain path works for an empty page", async ({ page }) => {
    const handle = await signUpToStart(page);
    await finishStart(page, handle);
    await expect(canvas(page).locator(".t-empty")).toBeVisible();
});
