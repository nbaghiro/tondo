import { expect, test } from "@playwright/test";
import { addSection, canvas, panel, signUpToEditor } from "./helpers";

test("a missing photo is a quiet tile with a clear way to add one", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "spotlight");
    const tile = canvas(page).locator('.b-fi img[title="Add a photo"]');
    await expect(tile).toHaveAttribute("src", /^data:image\/svg\+xml/);
    expect(await tile.getAttribute("src")).not.toContain("feTurbulence");

    const box = await tile.boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    await expect(panel(page).locator(".ph-tile")).toContainText("Add a photo");
    await expect(panel(page).locator(".ph-img")).toHaveCount(0);
});

test("a photo list shows empty entries as tiles, and one can be filled", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "photos");
    const empties = panel(page).locator(".phs-i.empty");
    await expect(empties.first().locator(".ph-glyph")).toBeVisible();
    const before = await empties.count();
    await empties.first().click();
    await panel(page).locator(".phs-open .pick button").first().click();
    await expect(empties).toHaveCount(before - 1);
});

test("Home shows a page's sample content until the page goes live", async ({ page }) => {
    await signUpToEditor(page, ["links"]);
    await page.goto("/app");
    const phone = page.locator(".pv iframe").contentFrame();
    await expect(phone.locator("a.b-btn")).toHaveCount(2);
    await expect(phone.locator("a.b-btn").first()).toHaveText("My website");
});

test("the live preview drops a missing photo where the block can do without", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "spotlight");
    await panel(page).getByLabel("Title", { exact: true }).fill("My own");
    await panel(page).getByRole("textbox", { name: "Link", exact: true }).fill("own.example.com");
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.locator(".publish").click();
    await page.getByRole("button", { name: "Publish without these" }).click();
    await expect(page.getByRole("heading", { name: "Your page is live" })).toBeVisible();
    await page.goto("/app");
    const phone = page.locator(".pv iframe").contentFrame();
    await expect(phone.locator(".b-feature")).toContainText("My own");
    await expect(phone.locator(".b-fi")).toHaveCount(0);
});

test("removes photos from a list by button and Delete, and undo brings them back", async ({
    page,
}) => {
    await signUpToEditor(page);
    await addSection(page, "photos");
    const tiles = panel(page).locator(".phs-i");
    const start = await tiles.count();

    await tiles.nth(1).click();
    await expect(tiles.nth(1)).toHaveClass(/\bon\b/);
    const remove = panel(page).getByRole("button", { name: "Remove photo 2", exact: true });
    await expect(remove).toBeVisible();
    await remove.click();
    await expect(tiles).toHaveCount(start - 1);
    await expect(tiles.nth(1)).toHaveClass(/\bon\b/);

    await page.locator('[aria-label="Undo"]').click();
    await expect(tiles).toHaveCount(start);

    await tiles.first().focus();
    await page.keyboard.press("Delete");
    await expect(tiles).toHaveCount(start - 1);
    await expect(canvas(page).locator("#t-blocks > section.t-s")).toHaveCount(1);
});

test("removing a single photo goes back to the placeholder", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "spotlight");
    await panel(page).locator(".ph-tile").click();
    await panel(page).locator(".pick button").first().click();
    const remove = panel(page).getByRole("button", { name: "Remove photo", exact: true });
    await panel(page)
        .locator(".ph-crop")
        .hover({ force: true })
        .catch(() => undefined);
    await remove.click();
    await expect(panel(page).locator(".ph-tile")).toBeVisible();
    await expect(canvas(page).locator('.b-fi img[title="Add a photo"]')).toBeVisible();
});
