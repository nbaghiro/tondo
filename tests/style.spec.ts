import { lookNames, samplePage } from "@tondo/page";
import type { LookName, PageStyle } from "@tondo/page";
import { contrast, lookColours, renderDocument } from "@tondo/render";
import { expect, test } from "@playwright/test";
import { addSection, canvas, openLook, panel, signUpToEditor } from "./helpers";

/** Large text and icons may sit lower, as WCAG allows. Body text needs this much. */
const BODY = 4.5;
const LARGE = 3;

interface Sample {
    fg: string;
    bg: string;
    large: boolean;
    what: string;
}

// Reads what the browser really paints, skipping text over a photo or art, which has no one colour.
function measure(): Sample[] {
    const solid = (value: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(value);
        if (!m?.[1]) return null;
        const parts = m[1].split(",").map(Number);
        if (parts[3] !== undefined && parts[3] < 0.99) return null;
        const hex = (n: number | undefined) => (n ?? 0).toString(16).padStart(2, "0");
        return `#${hex(parts[0])}${hex(parts[1])}${hex(parts[2])}`;
    };
    const out: Sample[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("main *, header *")) {
        const own = [...el.childNodes].some(
            (node) => node.nodeType === 3 && node.textContent?.trim(),
        );
        if (!own || !el.getBoundingClientRect().width) continue;
        const style = getComputedStyle(el);
        const fg = solid(style.color);
        if (!fg || style.visibility === "hidden" || Number(style.opacity) < 0.99) continue;
        let bg: string | null = null;
        let overArt = false;
        for (let at: HTMLElement | null = el; at; at = at.parentElement) {
            const s = getComputedStyle(at);
            if (s.backgroundImage !== "none" || at.querySelector(":scope > img, :scope > svg")) {
                overArt = at !== document.body && at !== document.documentElement;
                if (overArt) break;
            }
            bg = solid(s.backgroundColor);
            if (bg) break;
        }
        if (overArt) continue;
        const size = parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        out.push({
            fg,
            bg: bg ?? "#ffffff",
            large: size >= 24 || (size >= 18.66 && bold),
            what: `${el.tagName.toLowerCase()}.${el.className}`,
        });
    }
    return out;
}

// A look with no changes is left out: its colours are the approved design, and the guard only runs
// when someone changes them.
function stylesFor(look: LookName): PageStyle[] {
    const { colours, base } = lookColours(look);
    return [
        { colour: { mode: "preset", brand: colours[0] ?? base } },
        { colour: { mode: "plain", brand: base } },
        { colour: { mode: "dark", brand: base } },
        { colour: { mode: "brand", brand: "#ffe600" } },
        { colour: { mode: "brand", brand: "#4a1a6b" }, fill: "outline" },
        { colour: { mode: "brand", brand: "#0a8f5c" }, fill: "soft", bg: "gradient" },
    ];
}

test.describe("published pages stay readable", () => {
    test.beforeEach(({ browserName: _browser }, info) => {
        test.skip(info.project.name !== "desktop", "Rendering is the same on both");
    });

    for (const look of lookNames) {
        test(`in ${look}, with every kind of colour`, async ({ page }) => {
            const failures: string[] = [];
            for (const style of stylesFor(look)) {
                await page.setContent(
                    renderDocument(
                        { ...samplePage, look, style },
                        { title: "x", assetBase: "/photos/", editable: false },
                    ),
                );
                for (const sample of await page.evaluate(measure)) {
                    const ratio = contrast(sample.fg, sample.bg);
                    if (ratio < (sample.large ? LARGE : BODY)) {
                        failures.push(
                            `${JSON.stringify(style.colour?.mode ?? "own")} ${sample.what}: ${sample.fg} on ${sample.bg} = ${ratio.toFixed(2)}`,
                        );
                    }
                }
            }
            expect([...new Set(failures)]).toEqual([]);
        });
    }
});

test("a style change reaches the published page, with no script", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await addSection(page, "about");
    await panel(page).getByRole("button", { name: "Close" }).click();
    await openLook(page);
    await page.getByRole("tab", { name: "Make it yours" }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    const dark = await canvas(page)
        .locator("body")
        .evaluate((body) => getComputedStyle(body).backgroundColor);
    await page.locator(".publish").click();
    const anyway = page.getByRole("button", { name: "Publish anyway" });
    if (await anyway.isVisible()) await anyway.click();
    await expect(panel(page).locator("h2")).toHaveText("Your page is live");

    const visitor = await page.context().browser()?.newContext();
    const other = await visitor?.newPage();
    if (!other) throw new Error("No visitor page.");
    await other.goto(new URL(`/${handle}`, page.url()).href);
    expect(await other.locator("script").count()).toBe(0);
    expect(
        await other.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor),
    ).toBe(dark);
    await visitor?.close();
});

test("undo brings back the look's own style", async ({ page }) => {
    await signUpToEditor(page);
    await openLook(page);
    await page.getByRole("tab", { name: "Make it yours" }).click();
    await page.getByRole("button", { name: "Plain white" }).click();
    await expect(page.locator(".reset")).toBeVisible();
    await page.locator(".reset").click();
    await expect(page.locator(".reset")).toHaveCount(0);
});
