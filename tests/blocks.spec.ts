import { blockDefinitions, blockTypes, everyLayoutPage, lookNames, samplePage } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { expect, test } from "@playwright/test";
import { canvas, signUpToEditor } from "./helpers";

const LOOKS = ["madder", "signal", "sumi", "bloom", "pixel"] as const;

test.describe("every layout", () => {
    for (const look of LOOKS) {
        test(`fits a phone in ${look}`, async ({ page }, info) => {
            test.skip(info.project.name !== "desktop");
            await page.setViewportSize({ width: 390, height: 844 });
            await page.setContent(
                renderDocument(everyLayoutPage(look), {
                    title: "Blocks",
                    assetBase: "/",
                    editable: false,
                }),
            );
            const count = Object.values(blockDefinitions).reduce(
                (sum, definition) => sum + Object.keys(definition.layouts).length,
                0,
            );
            expect(count).toBe(66);
            const overflowing = await page.evaluate(() => {
                const clipped = (node: Element | null): boolean => {
                    for (let at = node; at; at = at.parentElement) {
                        if (getComputedStyle(at).overflowX !== "visible") return true;
                    }
                    return false;
                };
                return [...document.querySelectorAll("main *")]
                    .filter((el) => el.getBoundingClientRect().right > 391 && !clipped(el))
                    .map((el) => el.className);
            });
            expect(overflowing).toEqual([]);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
        });
    }

    test("a page only sends its own look", ({ browserName }) => {
        expect(browserName).toBeTruthy();
        const html = renderDocument(samplePage, { title: "x", assetBase: "/", editable: false });
        for (const other of lookNames.filter((name) => name !== samplePage.look)) {
            expect(html).not.toContain(`.${other}{`);
        }
        expect(html).not.toContain("Press+Start");
        expect(html).not.toContain(".b-tiers");
    });
});

test.describe("in the editor", () => {
    test("the shelf offers blocks that work and holds back the rest", async ({ page }) => {
        await signUpToEditor(page);
        const tabs = page.locator(".tabs .pill", { hasText: "Add" });
        if (await tabs.isVisible()) await tabs.click();
        const offered = blockTypes.filter((type) => !blockDefinitions[type].held);
        await expect(page.locator(".tile")).toHaveCount(offered.length);
        for (const held of ["tip", "signup", "form", "embed"] as const) {
            await expect(
                page.locator(".tile", { hasText: blockDefinitions[held].name }),
            ).toHaveCount(0);
        }
    });

    test("text inside a list can be edited in place", async ({ page }, info) => {
        test.skip(info.project.name === "phone", "On a phone the sheet's fields edit list items");
        await signUpToEditor(page);
        const tabs = page.locator(".tabs .pill", { hasText: "Add" });
        if (await tabs.isVisible()) await tabs.click();
        await page.locator(".tile", { hasText: "Products" }).click();
        const name = canvas(page).locator('[data-field="items.0.name"]');
        await expect(name).toHaveText("Tall ash vase");
        await name.click();
        await name.click();
        await page.keyboard.press("ControlOrMeta+a");
        await page.keyboard.type("Wide bowl");
        await page.keyboard.press("Escape");
        await expect(name).toHaveText("Wide bowl");
        await page.reload();
        await expect(canvas(page).locator('[data-field="items.0.name"]')).toHaveText("Wide bowl");
    });

    test("the look gallery shows every look and changes the page", async ({ page }) => {
        await signUpToEditor(page);
        const tab = page.locator(".tabs .pill", { hasText: "Look" });
        if (await tab.isVisible()) await tab.click();
        await expect(page.locator(".look-option")).toHaveCount(lookNames.length);
        await page.locator(".lk-filters .mini", { hasText: "Dark" }).click();
        const dark = await page.locator(".look-option").count();
        expect(dark).toBeGreaterThan(3);
        expect(dark).toBeLessThan(lookNames.length);
        await page.locator(".look-option", { hasText: "Noir" }).click();
        await expect(canvas(page).locator("html")).toHaveClass(/noir/);
        await page.locator('.lk-sw[aria-label="Sap"]').click();
        await expect(page.locator('.lk-sw[aria-label="Sap"]')).toHaveAttribute(
            "aria-pressed",
            "true",
        );
    });
});
