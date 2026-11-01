import { expect, test } from "@playwright/test";
import { addSection, canvas, panel, signUpToEditor, signUpToStart, finishStart } from "./helpers";

test("icons in the panels stay small", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "shop");
    const icons = panel(page).locator("svg.icon");
    expect(await icons.count()).toBeGreaterThan(0);
    for (const icon of await icons.all()) {
        const box = await icon.boundingBox();
        if (box) expect(box.width).toBeLessThanOrEqual(24);
    }
});

test("adding a section never moves the whole screen", async ({ page }) => {
    await signUpToEditor(page, ["links"]);
    await addSection(page, "shop");
    await page.waitForTimeout(600);
    const moved = await page.evaluate(() => [
        document.documentElement.scrollTop,
        document.body.scrollTop,
        window.scrollY,
    ]);
    expect(moved).toEqual([0, 0, 0]);
});

test("a new list section keeps its styles in view", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "A phone doesn't focus anything here.");
    await signUpToEditor(page);
    await addSection(page, "shop");
    await expect(panel(page).locator(".styles")).toBeInViewport();
    expect(
        await panel(page)
            .locator(".side-body")
            .evaluate((el) => el.scrollTop),
    ).toBe(0);
});

test("Back in the start flow sits beside Continue, clear of the logo", async ({ page }) => {
    const handle = await signUpToStart(page);
    await page.locator("#start-name").fill("Maya");
    await page.locator("[data-next]").click();
    const back = await page.getByRole("button", { name: "Back", exact: true }).boundingBox();
    const next = await page.locator("[data-next]").boundingBox();
    if (!back || !next) throw new Error("Buttons missing.");
    expect(Math.abs(back.y + back.height / 2 - (next.y + next.height / 2))).toBeLessThan(4);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await finishStart(page, handle);
});

test("publishing names what's wrong, opens it, and only then offers to publish", async ({
    page,
}) => {
    await signUpToEditor(page);
    await addSection(page, "shop");
    await panel(page).locator(".ls-h button").first().click();
    await panel(page).getByRole("textbox", { name: "Name" }).fill("Tall vase");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await page.locator(".publish").click();

    const issue = page.locator(".pub-issues li").first();
    await expect(issue).toContainText("Shop");
    await expect(issue).toContainText('"Tall vase"');
    await expect(page.getByRole("button", { name: /Publish/ }).last()).not.toHaveText(
        "Publish anyway",
    );

    await issue.locator("button").click();
    const link = panel(page).getByRole("textbox", { name: "Where to buy it" });
    await expect(link).toBeVisible();
    await expect(page.locator(".pub-back")).toContainText("1 left");
    await link.fill("https://example.com/vase");
    await expect(page.locator(".pub-back")).toHaveText("Back to publishing");
    await page.locator(".pub-back").click();
    await expect(page.getByRole("button", { name: "Publish anyway" })).toBeVisible();
    await expect(page.locator(".pub-issues")).toContainText("sample text");
    await page.getByRole("button", { name: "Publish anyway" }).click();
    await expect(panel(page).locator("h2")).toHaveText("Your page is live");
});

test("Download shows as coming, and can't be added", async ({ page }) => {
    await signUpToEditor(page);
    const search = page.getByPlaceholder("Paste a link, or search to add").first();
    if (await page.locator(".tabbar").isVisible()) {
        await page.locator(".tabbar button", { hasText: "Sections" }).click();
    }
    await search.fill("pdf");
    await expect(page.locator("[data-add=download]")).toBeDisabled();
    await search.press("Enter");
    await expect(page.locator(".status")).not.toHaveText("Saving");
    await expect(canvas(page).locator(".t-s")).toHaveCount(0);
});

test("the editor still shows sample words while they're being edited", async ({ page }) => {
    await signUpToEditor(page);
    await addSection(page, "proof");
    await expect(canvas(page).locator("#t-blocks")).toContainText(/\w+/);
});
