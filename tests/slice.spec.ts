import { expect, test } from "@playwright/test";
import { addSection, canvas, openLook, openSections, panel, signUpToEditor } from "./helpers";

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

test("styles are drawn, and trying one loses nothing", async ({ page }) => {
    await addSection(page, "links");
    await expect(panel(page).locator(".st")).toHaveCount(7);
    await panel(page).locator(".st svg").first().waitFor();
    await panel(page).locator("[data-style]", { hasText: "With photos" }).click();
    await expect(canvas(page).locator(".b-btn")).toHaveCount(0);
    await panel(page).locator("[data-style]", { hasText: "Buttons" }).click();
    await expect(canvas(page).locator(".b-btn").first()).toContainText("My website");
});

test("a pasted link is understood, and fills in empty words", async ({ page }) => {
    await addSection(page, "links");
    const link = panel(page).getByRole("textbox", { name: "Link" });
    await link.fill("javascript:alert(1)");
    await expect(panel(page).locator(".lk-m.bad")).toBeVisible();
    await link.fill("instagram.com/maya");
    await expect(panel(page).locator(".lk-m.ok")).toContainText("Instagram");
    const button = canvas(page).locator(".b-btn").first();
    await expect(button).toHaveAttribute("href", "https://instagram.com/maya");
    await link.fill("maya@example.com");
    await expect(button).toHaveAttribute("href", "mailto:maya@example.com");
});

test("hiding a section dims it here, and says so in the list", async ({ page }) => {
    await addSection(page, "about");
    await panel(page).locator("summary", { hasText: "More options" }).click();
    await panel(page).getByRole("switch", { name: "Show on my page" }).click({ force: true });
    await expect(canvas(page).locator(".t-off .t-badge").first()).toHaveText("Hidden");
    await page.keyboard.press("Escape");
    await openSections(page);
    await expect(page.locator("#rows .row small")).toHaveText("Hidden");
});

test("the toolbar moves, copies and removes", async ({ page }) => {
    await addSection(page, "about");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await addSection(page, "links");
    const sections = canvas(page).locator("#t-blocks > section.t-s");
    await expect(sections).toHaveCount(2);
    const tools = canvas(page).locator("#t-tools");
    await tools.locator('[data-t="up"]').click();
    await expect(sections.first().locator(".b-btn")).toHaveCount(3);
    await canvas(page).locator("#t-tools [data-t=copy]").click();
    await expect(sections).toHaveCount(3);
    await canvas(page).locator("#t-tools [data-t=remove]").click();
    await expect(sections).toHaveCount(2);
});

test("the header draws no empty placeholders, selected or not", async ({ page }) => {
    await canvas(page).locator("#t-header h1").click();
    await panel(page).getByRole("button", { name: "Clear Short line" }).click();
    await page.locator(".status", { hasText: "Saved" }).waitFor();
    await page.reload();
    await expect(canvas(page).locator("#t-header .p-tag")).toBeHidden();
    await canvas(page).locator("#t-header h1").click();
    await expect(canvas(page).locator("#t-header .p-tag")).toBeHidden();
    await expect(panel(page).locator("[data-layout]")).toHaveCount(6);
});

test("a look with a signature header draws it, and a general layout replaces it", async ({
    page,
}, info) => {
    await openLook(page);
    await page.locator(".tile[data-look=surf]").click();
    await expect(canvas(page).locator(".p-sun")).toHaveCount(1);
    if (info.project.name === "phone") await page.keyboard.press("Escape");
    await canvas(page).locator("#t-header h1").click();
    await panel(page).locator("[data-layout]", { hasText: "Centred" }).click();
    await expect(canvas(page).locator(".p-sun")).toHaveCount(0);
});

test("the gallery edits photos and captions", async ({ page }) => {
    await addSection(page, "photos");
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(6);
    await panel(page)
        .getByRole("button", { name: /^Photo 1 / })
        .click();
    await panel(page).getByRole("button", { name: "Remove photo 1", exact: true }).click();
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(5);
    await panel(page).getByRole("button", { name: "Add photos" }).click();
    await panel(page).getByRole("button", { name: "Use photo man0" }).click();
    await expect(canvas(page).locator(".b-gal img")).toHaveCount(6);
});

test("a link in the header sets its own icon", async ({ page }) => {
    await canvas(page).locator("#t-header h1").click();
    await panel(page).getByRole("button", { name: "Add an icon" }).click();
    await panel(page).getByRole("textbox", { name: "Address" }).fill("youtube.com/maya");
    await expect(canvas(page).locator('#t-header [aria-label="youtube"]')).toHaveCount(1);
    await expect(panel(page).locator(".ls-n").last()).toHaveText("YouTube");
});

test("on a phone the sheet grows and closes from its grip", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "Phone only");
    await canvas(page).locator("#t-header h1").tap();
    const sheet = panel(page);
    await expect(sheet.locator("h2")).toBeVisible();
    const half = await sheet.boundingBox();
    await sheet.locator(".sheet-grip").click();
    await expect
        .poll(async () => (await sheet.boundingBox())?.height)
        .toBeGreaterThan(half?.height ?? 0);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(page.locator(".build")).not.toHaveAttribute("data-sheet", "section");
});

test("a new section's first field gets focus on a computer, and not on a phone", async ({
    page,
}, info) => {
    await addSection(page, "links");
    const field = panel(page).getByRole("textbox", { name: "Link" });
    if (info.project.name === "phone") await expect(field).not.toBeFocused();
    else await expect(field).toBeFocused();
});

test("the header panel has a Social icons row, and tapping the icons opens it", async ({
    page,
}) => {
    await canvas(page).locator("#t-header h1").click();
    const row = panel(page).locator("#social-icons");
    await expect(row).toContainText("Social icons");
    await row.getByRole("button", { name: "Add an icon" }).click();
    await row.getByRole("textbox", { name: "Address" }).fill("youtube.com/maya");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await expect(panel(page)).toHaveCount(0);
    await canvas(page).locator('#t-header [aria-label="youtube"]').click();
    await expect(panel(page).locator("#social-icons")).toBeInViewport();
});

test("search finds Socials and contact by what people call it", async ({ page }) => {
    await openSections(page);
    for (const word of ["instagram", "social", "socials", "icons", "contact"]) {
        await page.locator("#q").fill(word);
        await expect(page.locator("[data-add=find]")).toContainText("Socials and contact");
    }
});
