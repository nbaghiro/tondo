import { expect, test } from "@playwright/test";
import { addSection, canvas, panel, signUpToEditor } from "./helpers";

const desktopOnly = (name: string) => {
    test.skip(name === "phone", "Uses a mouse");
};

test.beforeEach(async ({ page }) => {
    await signUpToEditor(page);
});

const titleField = (page: Parameters<typeof panel>[0]) =>
    panel(page).getByLabel("Title above it (optional)");

test("adds a section, edits it in the panel, and undoes", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    const heading = canvas(page).locator("#t-blocks h2");
    await expect(heading).toHaveCount(1);
    await titleField(page).fill("Workshops");
    await expect(heading).toHaveText("Workshops");
    await page.locator('[aria-label="Undo"]').click();
    await expect(heading).not.toHaveText("Workshops");
});

test("edits text in place, and the panel follows", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    const heading = canvas(page).locator("#t-blocks h2");
    await heading.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Typed here");
    await expect(titleField(page)).toHaveValue("Typed here");
    await page.keyboard.press("Enter");
    await expect(heading).toHaveText("Typed here");
});

test("moves a whole section by dragging its handle on the page", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "links");
    await addSection(page, "about");
    await page.keyboard.press("Escape");
    const sections = canvas(page).locator("#t-blocks > section.t-s");
    await expect(sections).toHaveCount(2);
    await expect(sections.first().locator(".b-btn")).toHaveCount(3);
    await sections.first().hover();
    const grip = await sections.first().locator(".t-grip").boundingBox();
    const to = await sections.last().boundingBox();
    if (!grip || !to) throw new Error("The section has no size.");
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x, to.y + to.height - 2, { steps: 12 });
    await page.mouse.up();
    await expect(sections.last().locator(".b-btn")).toHaveCount(3);
    await expect(page.locator("#rows .row").last()).toContainText("Links");
});

test("moves a section by dragging its row in the list", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "links");
    await addSection(page, "about");
    const rows = page.locator("#rows .row");
    await expect(rows.first()).toContainText("Links");
    const from = await rows.first().locator(".grip2").boundingBox();
    const to = await rows.last().boundingBox();
    if (!from || !to) throw new Error("The row has no size.");
    await page.mouse.move(from.x + 4, from.y + 4);
    await page.mouse.down();
    await page.mouse.move(from.x + 4, to.y + to.height - 2, { steps: 8 });
    await page.mouse.up();
    await expect(rows.first()).toContainText("About");
    await expect(
        canvas(page).locator("#t-blocks > section.t-s").last().locator(".b-btn"),
    ).toHaveCount(3);
});

test("drags a new section from the list to a spot on the page", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "links");
    await addSection(page, "about");
    await page.keyboard.press("Escape");
    await page.locator(".add-row").click();
    const pick = await page.locator("[data-add=photos]").boundingBox();
    const box = await canvas(page).locator("#t-blocks > section.t-s").first().boundingBox();
    if (!pick || !box) throw new Error("Nothing to drag.");
    await page.mouse.move(pick.x + 20, pick.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 2, { steps: 10 });
    await page.mouse.up();
    await expect(
        canvas(page).locator("#t-blocks > section.t-s").first().locator(".b-gal"),
    ).toHaveCount(1);
});

test("the delete key removes the selected section", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    await page.keyboard.press("Escape");
    await page.locator("#rows .row").first().click();
    await page.keyboard.press("Delete");
    await expect(canvas(page).locator("#t-blocks h2")).toHaveCount(0);
});

test("the draft survives a reload", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    await titleField(page).fill("Still here");
    await expect(page.locator(".status")).toHaveText("Saved");
    await page.reload();
    await expect(canvas(page).locator("#t-blocks h2")).toHaveText("Still here");
});

test("on a phone, tapping a section opens the sheet with it still in view", async ({
    page,
}, info) => {
    test.skip(info.project.name !== "phone", "Phone only");
    await addSection(page, "about");
    await expect(titleField(page)).toBeVisible();
    await expect(canvas(page).locator("#t-blocks h2")).toBeInViewport();
});

test("a short window keeps the phone's proportions, scrolls to all of it and drags true", async ({
    page,
}, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "links");
    await addSection(page, "about");
    await page.keyboard.press("Escape");

    const measure = () =>
        page.evaluate(() => {
            const stage = document.querySelector<HTMLElement>(".build .stage");
            const phone = document.querySelector(".build .phone")?.getBoundingClientRect();
            const inner = document.querySelector(".build .phone iframe")?.getBoundingClientRect();
            return {
                spare: (stage?.scrollHeight ?? 0) - (stage?.clientHeight ?? 0),
                ratio: (phone?.width ?? 0) / (phone?.height ?? 1),
                inner: inner?.width ?? 0,
            };
        });

    await page.setViewportSize({ width: 1440, height: 1000 });
    const tall = await measure();
    expect(tall.spare).toBeLessThanOrEqual(0);
    expect(tall.ratio).toBeCloseTo(414 / 868, 2);

    await page.setViewportSize({ width: 1280, height: 620 });
    const short = await measure();
    expect(short.spare).toBeGreaterThan(0);
    expect(short.ratio).toBeCloseTo(414 / 868, 2);
    expect(short.inner).toBeGreaterThanOrEqual(319.5);

    await page.locator(".build .stage").evaluate((stage) => {
        stage.scrollTop = stage.scrollHeight;
    });
    const end = await page.locator(".build .phone").boundingBox();
    expect((end?.y ?? 0) + (end?.height ?? 0)).toBeLessThanOrEqual(620);

    const sections = canvas(page).locator("#t-blocks > section.t-s");
    await sections.first().hover();
    const grip = await sections.first().locator(".t-grip").boundingBox();
    const to = await sections.last().boundingBox();
    if (!grip || !to) throw new Error("The section has no size.");
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x, to.y + to.height - 2, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator("#rows .row").last()).toContainText("Links");
});

test("a normal save shows no word in the bar, and still announces it", async ({ page }) => {
    await addSection(page, "links");
    const status = page.locator(".status[role=status]");
    await expect(status).toHaveText("Saved");
    const box = await status.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(1);
});

test("the add panel searches by meaning, adds on Enter and keeps its sections in view", async ({
    page,
    isMobile,
}) => {
    if (isMobile) await page.locator(".tabbar button", { hasText: "Add" }).click();
    else await page.locator(".add-row").click();
    const search = page.locator("#add-q");
    const list = page.locator(".lside [data-add]");
    if (isMobile) await expect(search).not.toBeFocused();
    else await expect(search).toBeFocused();
    const all = await list.count();

    await search.fill("zzzz");
    await expect(page.locator(".lside .hint-box")).toContainText("Nothing matches");
    await search.fill("cv");
    await expect(list.first()).toBeVisible();
    expect(await list.count()).toBeLessThan(all);
    await search.fill("newsletter");
    await expect(list.first()).toBeVisible();
    await search.fill("");
    await expect(list).toHaveCount(all);
    await search.fill("instagram.com/maya");
    await expect(page.locator(".lside [data-route]")).toBeVisible();
    await search.fill("about");
    await search.press("Enter");
    await expect(canvas(page).locator("#t-blocks > section.t-s")).toHaveCount(1);
});

test("the add panel's search stays fixed and shows 12 sections at 1080 tall", async ({
    page,
}, info) => {
    desktopOnly(info.project.name);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator(".add-row").click();
    await page.locator("[data-add=links]").waitFor();
    const shown = await page.evaluate(() => {
        const body = document.querySelector(".lside .side-body");
        const box = body?.getBoundingClientRect();
        if (!body || !box) return 0;
        body.scrollTop = 120;
        const stuck = document.querySelector(".add-find")?.getBoundingClientRect().top ?? 0;
        if (Math.abs(stuck - box.top) > 1) return -1;
        body.scrollTop = 0;
        return [...document.querySelectorAll(".lside [data-add]")].filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.top >= box.top && rect.bottom <= box.bottom;
        }).length;
    });
    expect(shown).toBeGreaterThanOrEqual(12);
});

test("clicking empty page closes the panel, keeps what was typed, and tools don't close it", async ({
    page,
}, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    const open = panel(page);
    await expect(open).toBeVisible();

    await open.locator("h2").first().click();
    await page.locator(".lside h2").click();
    await expect(open).toBeVisible();

    await titleField(page).fill("Kept");
    const frame = await page.locator("iframe.canvas").boundingBox();
    if (!frame) throw new Error("The canvas has no size.");
    await page.mouse.click(frame.x + frame.width / 2, frame.y + frame.height - 20);
    await expect(open).toHaveCount(0);
    await expect(canvas(page).locator("#t-blocks h2")).toHaveText("Kept");
});

test("clicking the stage closes the panel, but a drag across it doesn't", async ({
    page,
}, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    const open = panel(page);
    const stage = await page.locator(".build .phone").boundingBox();
    if (!stage) throw new Error("The phone has no size.");
    const spot = { x: stage.x - 60, y: stage.y + 300 };

    await page.mouse.move(spot.x, spot.y);
    await page.mouse.down();
    await page.mouse.move(spot.x - 60, spot.y + 40, { steps: 5 });
    await page.mouse.up();
    await expect(open).toBeVisible();

    await page.mouse.click(spot.x, spot.y);
    await expect(open).toHaveCount(0);

    await addSection(page, "links");
    await page.keyboard.press("Escape");
    await expect(open).toHaveCount(0);
});

test("selecting text on the page doesn't close the panel", async ({ page }, info) => {
    desktopOnly(info.project.name);
    await addSection(page, "about");
    const open = panel(page);
    const frame = await page.locator("iframe.canvas").boundingBox();
    if (!frame) throw new Error("The canvas has no size.");
    const y = frame.y + frame.height - 20;
    await page.mouse.move(frame.x + 40, y);
    await page.mouse.down();
    await page.mouse.move(frame.x + 200, y, { steps: 5 });
    await page.mouse.up();
    await expect(open).toBeVisible();
});

test("tapping the page above the sheet closes it on a phone", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "Uses the phone's sheet");
    await addSection(page, "about");
    const open = page.locator(".rside.open");
    await expect(open).toBeVisible();
    // The section sits at the top of the small canvas, so scroll past it to reach empty page.
    const blank = canvas(page).locator("main.page");
    await blank.evaluate((node) => {
        node.style.paddingBottom = "600px";
        node.ownerDocument.scrollingElement?.scrollTo(0, 99999);
    });
    const frame = await page.locator("iframe.canvas").boundingBox();
    if (!frame) throw new Error("The canvas has no size.");
    await page.touchscreen.tap(frame.x + frame.width / 2, frame.y + 60);
    await expect(open).toHaveCount(0);
});
