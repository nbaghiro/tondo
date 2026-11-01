import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { addSection, canvas, finishStart, signUpToEditor, signUpToStart } from "./helpers";

const draftUrl = "/api/v1/me/page";

const openHelp = async (page: Page) => {
    await page.locator(".helpme").click();
    await expect(page.locator("#help-input")).toBeVisible();
};
const ask = async (page: Page, words: string) => {
    await page.locator("#help-input").fill(words);
    await page.locator("#help-input").press("Enter");
};
const saved = async (page: Page) => {
    await expect(page.locator(".saved")).toHaveAttribute("data-state", "saved");
};
const draft = (page: Page) =>
    page.evaluate(
        async (url) =>
            (await (await fetch(url)).json()) as {
                page: { style?: { shape?: string }; look: string; blocks: unknown[] };
                published: boolean;
                updatedAt: string;
            },
        draftUrl,
    );

test("one request edits the page, and one undo restores it", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await openHelp(page);
    await expect(page.locator(".help-first")).toContainText("nothing goes live until you publish");
    await ask(page, "make the buttons softer");
    await expect(page.locator(".help-changes")).toContainText("Corners set to soft");
    await expect(page.locator("[data-help-credits]")).toContainText("14 credits");
    await expect.poll(async () => (await draft(page)).page.style?.shape).toBe("soft");
    await page.locator(".help-undo").click();
    await expect(page.locator(".help-undo")).toHaveCount(0);
    await saved(page);
    await expect.poll(async () => (await draft(page)).page.style?.shape).toBeUndefined();
});

test("the page is locked during a turn, and Stop changes nothing", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await openHelp(page);
    await ask(page, "something slow please");
    await expect(page.locator(".build.locked")).toBeVisible();
    await expect(page.locator(".help-working")).toBeVisible();
    await page.locator(".help-stop").click();
    await expect(page.locator(".help-note")).toContainText("Stopped. Your page hasn't changed.");
    await expect(page.locator(".build.locked")).toHaveCount(0);
    await expect(page.locator("[data-help-credits]")).toContainText("15 credits");
});

test("an invented review is refused, and the page stays as it was", async ({ page }) => {
    await signUpToEditor(page);
    const before = await draft(page);
    await openHelp(page);
    await ask(page, "write me a glowing review");
    await expect(page.locator(".help-reply")).toContainText("didn't tell me");
    await expect(page.locator(".help-undo")).toHaveCount(0);
    expect((await draft(page)).page.blocks).toEqual(before.page.blocks);
});

test("publishing is only ever a button the person presses", async ({ page }) => {
    await signUpToEditor(page);
    await openHelp(page);
    await ask(page, "publish it");
    await expect(page.locator("[data-help-publish]")).toBeVisible();
    expect((await draft(page)).published).toBe(false);
    await page.locator("[data-help-publish]").click();
    await expect(page.locator("#help-input")).toHaveCount(0);
    expect((await draft(page)).published).toBe(false);
});

test("removing several sections asks first", async ({ page }) => {
    await signUpToEditor(page, ["about", "links"]);
    const before = (await draft(page)).page.blocks.length;
    await openHelp(page);
    await ask(page, "remove everything");
    const card = page.locator(".help-card");
    await expect(card).toContainText("Remove 2 sections?");
    expect((await draft(page)).page.blocks.length).toBe(before);
    await card.locator(".help-go").click();
    await expect(page.locator(".help-note")).toContainText("Removed 2 sections");
    await expect.poll(async () => (await draft(page)).page.blocks.length).toBe(0);
});

test("building on a page with content offers to replace it", async ({ page }) => {
    await signUpToEditor(page, ["about"]);
    await page.evaluate(async (url) => {
        const now = (await (await fetch(url)).json()) as {
            page: { header: object };
            updatedAt: string;
        };
        await fetch(url, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                updatedAt: now.updatedAt,
                page: { ...now.page, header: { ...now.page.header, bio: "My own words." } },
            }),
        });
    }, draftUrl);
    await page.reload();
    await openHelp(page);
    await ask(page, "I'm a dog walker in Halifax, please build Halifax Dog Walking");
    await expect(page.locator(".help-card")).toContainText("This replaces what's on your page");
    expect((await draft(page)).page.look).not.toBe("biscuit");
    await page.locator(".help-go", { hasText: "Replace my page" }).click();
    await expect.poll(async () => (await draft(page)).page.look).toBe("biscuit");
});

test("a saved conflict stops a turn from starting", async ({ page }) => {
    await signUpToEditor(page);
    await page.evaluate(async (url) => {
        const now = (await (await fetch(url)).json()) as { page: object; updatedAt: string };
        await fetch(url, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ updatedAt: now.updatedAt, page: now.page }),
        });
    }, draftUrl);
    await addSection(page, "about");
    await expect(page.locator(".saved")).toHaveAttribute("data-state", "conflict");
    await openHelp(page);
    await ask(page, "make the buttons softer");
    await expect(page.locator(".help-note")).toContainText("Your page changed in another tab");
});

test("running out of credits says so, and everything else still works", async ({ page }) => {
    await signUpToEditor(page);
    await page.route("**/api/v1/me/assistant/turn", (route) =>
        route.fulfill({
            status: 402,
            contentType: "application/json",
            body: JSON.stringify({ error: "You've used this month's credits." }),
        }),
    );
    await openHelp(page);
    await ask(page, "make the buttons softer");
    await expect(page.locator(".help-note")).toContainText("You've used this month's credits.");
    await expect(page.locator(".build.locked")).toHaveCount(0);
});

test("a stock photo is added only when picked, with its credit", async ({ page }) => {
    await signUpToEditor(page);
    await openHelp(page);
    await ask(page, "find a photo of a surf lesson");
    await expect(page.locator(".help-photos figcaption")).toContainText("A photographer");
    await expect(page.locator(".help-small a", { hasText: "Openverse" })).toBeVisible();
    await page.locator(".help-photos button").first().click();
    await expect(page.locator(".help-note")).toContainText("Added the photo by A photographer");
    await expect
        .poll(async () => JSON.stringify((await draft(page)).page))
        .toMatch(/"photo":\{"file":"uploads\//);
});

test("a generated image shows its cost first, and costs nothing until agreed", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await openHelp(page);
    await ask(page, "make me a simple logo");
    const card = page.locator(".help-card").first();
    await expect(card).toContainText("Make 2 logo ideas? This uses 6 of your 14 credits.");
    await card.locator(".help-go").click();
    await expect(page.locator(".help-photos img")).toHaveCount(2);
    await expect(page.locator(".help-card").last()).toContainText("Made with AI");
    await expect(page.locator("[data-help-credits]")).toContainText("8 credits");
    await page.locator(".help-chip", { hasText: "None of these" }).click();
    await expect(page.locator(".help-photos img")).toHaveCount(0);
});

test("the start flow builds from a line, and works without one", async ({ page }) => {
    const handle = await signUpToStart(page);
    await page.locator("#start-name").fill("Halifax Dog Walking");
    await page.locator("#start-about").fill("I'm a dog walker in Halifax");
    await page.locator("[data-next]").click();
    await expect(page.getByRole("heading", { name: /look/i })).toBeVisible();
    await page.locator("[data-next]").click();
    await expect(page.locator("#start-handle")).toHaveValue(handle);
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();
    await expect(page.locator(".address")).toContainText(handle);
    await expect(canvas(page).locator("body")).toContainText("A dog walker in Halifax");
});

test("the flow without a line is unchanged", async ({ page }) => {
    const handle = await signUpToStart(page);
    await finishStart(page, handle);
    await expect(page.locator(".helpme")).toBeVisible();
});

test("Home links to Help me", async ({ page }) => {
    await signUpToEditor(page);
    await page.goto("/app/");
    await page.locator("[data-home-help]").click();
    await expect(page.locator("#help-input")).toBeVisible();
});
