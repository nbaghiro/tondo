import { expect, test } from "@playwright/test";
import {
    addSection,
    canvas,
    finishStart,
    openSections,
    panel,
    signUpToEditor,
    signUpToStart,
} from "./helpers";

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
        "Publish without these",
    );

    await issue.locator("button").click();
    const link = panel(page).getByRole("textbox", { name: "Where to buy it" });
    await expect(link).toBeVisible();
    await expect(page.locator(".pub-back")).toContainText("1 left");
    await link.fill("https://example.com/vase");
    await expect(page.locator(".pub-back")).toHaveText("Back to publishing");
    await page.locator(".pub-back").click();
    await expect(page.getByRole("button", { name: "Publish without these" })).toBeVisible();
    await expect(page.locator(".pub-issues")).toContainText("sample");
    await page.getByRole("button", { name: "Publish without these" }).click();
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

test("a lone tab's content goes live without a tab bar, and the page loads", async ({
    page,
}, info) => {
    test.skip(info.project.name === "phone", "The cause isn't device-specific.");
    const handle = await signUpToEditor(page);
    await addSection(page, "tabs");
    await canvas(page).locator(".b-tabbar label").first().click();
    await addSection(page, "about");
    const text = panel(page).locator("textarea.in").first();
    await text.fill("Words of my own in a tab");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.waitForTimeout(800);
    const go = page.locator(".pub .go");
    if (await go.isVisible()) await go.click();
    await expect(page.locator(".pub-link")).toBeVisible({ timeout: 20_000 });
    const res = await page.request.get(`/${handle}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("Words of my own in a tab");
    expect(html).not.toContain("b-tabbar");
});

test("every publish problem opens what needs fixing, in view", async ({ page }) => {
    await signUpToEditor(page, ["links", "shop"]);
    // An empty social icon.
    await canvas(page).locator("#t-header").click();
    await panel(page).locator('.social-row button:has-text("Add")').first().click();
    await page.keyboard.press("Escape");
    // A section with real words and no link.
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const issues = page.locator(".pub-issues button");
    await expect(issues.first()).toBeVisible();
    await issues.filter({ hasText: "social icons" }).click();
    await page.waitForTimeout(500);
    await expect(panel(page).locator(".social-row .ls-i.open input").first()).toBeInViewport();
});

test("the publish list follows the page, and Publish is there as soon as nothing blocks", async ({
    page,
}) => {
    await signUpToEditor(page);
    await canvas(page).locator("#t-header").click();
    await panel(page).locator('[data-ask="bio"] textarea').fill("A line of my own");
    await panel(page).locator('.social-row button:has-text("Add")').first().click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.locator(".pub-issues button").filter({ hasText: "social icons" }).click();
    const row = panel(page).locator(".social-row .ls-i.open input").first();
    await row.fill("https://instagram.com/june");
    await page.locator(".pub-back").click();
    await expect(page.locator(".pub .go")).toBeVisible();
});

test("a page with only its top can publish", async ({ page }) => {
    await signUpToEditor(page);
    await canvas(page).locator("#t-header").click();
    await panel(page).locator('[data-ask="bio"] textarea').fill("Just a line about me");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.locator(".pub-link, .pub .go").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".pub-issues")).toHaveCount(0);
});

test("a second media link is added, and doesn't replace the first", async ({ page }) => {
    await signUpToEditor(page);
    const paste = async (link: string) => {
        await openSections(page);
        await page.locator("#q").fill(link);
        await page.locator("[data-route]").click();
        await page.keyboard.press("Escape");
    };
    await paste("https://open.spotify.com/album/first");
    await paste("https://www.youtube.com/watch?v=second");
    await page.waitForTimeout(1500);
    const draft = await page.evaluate(async () => (await fetch("/api/v1/me/page")).text());
    expect(draft).toContain("open.spotify.com/album/first");
    expect(draft).toContain("youtube.com/watch?v=second");
});
