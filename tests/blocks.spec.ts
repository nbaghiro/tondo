import {
    blockDefinitions,
    everyLayoutPage,
    lookNames,
    samplePage,
    sectionAvailable,
    sectionDefinitions,
} from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { expect, test } from "@playwright/test";
import { addSection, canvas, openLook, signUpToEditor } from "./helpers";

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
            expect(count).toBe(70);
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
    test("the list offers sections that work and marks the rest as coming", async ({ page }) => {
        await signUpToEditor(page);
        const tab = page.locator(".tabbar button", { hasText: "Add" });
        if (await tab.isVisible()) await tab.click();
        else await page.locator(".add-row").click();
        await expect(page.locator("[data-add]")).toHaveCount(sectionDefinitions.length);
        for (const definition of sectionDefinitions) {
            const pick = page.locator(`[data-add=${definition.key}]`);
            if (sectionAvailable(definition)) await expect(pick).toBeEnabled();
            else await expect(pick).toBeDisabled();
        }
        await expect(page.locator("[data-add=tip]")).toContainText("Soon");
    });

    test("text inside a list can be edited in place", async ({ page }, info) => {
        test.skip(info.project.name === "phone", "On a phone the sheet's fields edit list items");
        await signUpToEditor(page);
        await addSection(page, "shop");
        const name = canvas(page).locator('[data-field="items.0.name"]');
        await expect(name).toHaveText("First thing");
        await name.click();
        await name.click();
        await page.keyboard.press("ControlOrMeta+a");
        await page.keyboard.type("Wide bowl");
        await page.keyboard.press("Escape");
        await expect(name).toHaveText("Wide bowl");
        await expect(page.locator(".status")).toHaveText("Saved");
        await page.reload();
        await expect(canvas(page).locator('[data-field="items.0.name"]')).toHaveText("Wide bowl");
    });

    test("the look gallery shows every look and changes the page", async ({ page }) => {
        await signUpToEditor(page);
        await openLook(page);
        await expect(page.locator(".tile")).toHaveCount(lookNames.length);
        await page.locator(".filters .chip", { hasText: "Dark" }).click();
        const dark = await page.locator(".tile").count();
        expect(dark).toBeGreaterThan(3);
        expect(dark).toBeLessThan(lookNames.length);
        await page.locator(".tile[data-look=noir]").click();
        await expect(canvas(page).locator("html")).toHaveClass(/noir/);
        await page.getByRole("tab", { name: "Make it yours" }).click();
        const swatch = page.getByRole("button", { name: "A colour from this look" }).first();
        await swatch.click();
        await expect(swatch).toHaveAttribute("aria-pressed", "true");
    });
});

const LONG_NAMES = [
    "Alexandria Montgomery-Whitfield Studio of Fine Art and Ceramics",
    "Wolfeschlegelsteinhausenbergerdorff",
];

test.describe("a name of ordinary words", () => {
    for (const look of lookNames) {
        test(`doesn't break a word in ${look}`, async ({ page }, info) => {
            test.skip(info.project.name !== "desktop");
            await page.route(/fonts\.g/, (route) => route.abort());
            await page.setViewportSize({ width: 390, height: 844 });
            for (const name of ["Maya Okafor", "Alexandra Montgomery H", "Christopher Lindqvist"]) {
                await page.setContent(
                    renderDocument(
                        {
                            ...samplePage,
                            look,
                            header: { ...samplePage.header, layout: "look", name },
                        },
                        { title: "Name", assetBase: "/", editable: false },
                    ),
                    { waitUntil: "domcontentloaded" },
                );
                const broken = await page.evaluate(() => {
                    const node = document.querySelector("#t-header h1")?.firstChild;
                    if (!node?.textContent) return [];
                    const out: string[] = [];
                    for (const match of node.textContent.matchAll(/\S+/g)) {
                        const range = document.createRange();
                        range.setStart(node, match.index);
                        range.setEnd(node, match.index + match[0].length);
                        const tops = new Set(
                            [...range.getClientRects()].map((rect) => Math.round(rect.top)),
                        );
                        if (tops.size > 1) out.push(match[0]);
                    }
                    return out;
                });
                expect(broken, `${look}: ${name}`).toEqual([]);
            }
        });
    }
});

test.describe("a long name", () => {
    for (const look of lookNames) {
        test(`fits in ${look}`, async ({ page }, info) => {
            test.skip(info.project.name !== "desktop");
            await page.route(/fonts\.g/, (route) => route.abort());
            await page.setViewportSize({ width: 390, height: 844 });
            for (const name of LONG_NAMES) {
                await page.setContent(
                    renderDocument(
                        {
                            ...samplePage,
                            look,
                            header: { ...samplePage.header, layout: "look", name },
                        },
                        { title: "Name", assetBase: "/", editable: false },
                    ),
                    { waitUntil: "domcontentloaded" },
                );
                const spill = await page.evaluate(() => {
                    const h1 = document.querySelector("#t-header h1");
                    if (!h1) return "no name";
                    const range = document.createRange();
                    range.selectNodeContents(h1);
                    const text = range.getBoundingClientRect();
                    if (text.left < -1 || text.right > innerWidth + 1) return "off the screen";
                    // A frame around the name has to hold it.
                    for (
                        let at = h1.parentElement;
                        at && at.id !== "t-header";
                        at = at.parentElement
                    ) {
                        const box = at.getBoundingClientRect();
                        if (
                            getComputedStyle(at).overflow === "hidden" &&
                            text.height > box.height + 1
                        ) {
                            return `clipped by ${at.className}`;
                        }
                        if (
                            box.width < innerWidth - 2 &&
                            box.width > 0 &&
                            (text.right > box.right + 1 ||
                                text.left < box.left - 1 ||
                                text.bottom > box.bottom + 1)
                        ) {
                            return `spills out of ${at.className}`;
                        }
                    }
                    return null;
                });
                expect(spill, `${look}: ${name}`).toBeNull();
            }
        });
    }
});
