import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { signUpToEditor } from "./helpers";

/** Measures every visible piece of text on the page against the solid colour behind it. */
async function lowContrast(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const parse = (value: string) => {
            const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
            return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts[3] ?? 1 };
        };
        const luminance = (c: { r: number; g: number; b: number }) => {
            const linear = (v: number) => {
                const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
        };
        const found = new Set<string>();
        // Example looks and photos carry their own colours, and aren't Tondo's text.
        const skip = ".bk-in, .demo-look, .pg, .tile[data-look], .look-mini, .col-sw, [disabled]";
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const element = node.parentElement;
            if (!element || !node.textContent?.trim() || element.closest(skip)) continue;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            if (style.visibility !== "visible" || !box.width || !box.height) continue;
            if (style.opacity === "0" || ["SCRIPT", "STYLE"].includes(element.tagName)) continue;
            let behind = { r: 255, g: 255, b: 255, a: 1 };
            let painted = false;
            for (let at: Element | null = element; at; at = at.parentElement) {
                const own = getComputedStyle(at);
                if (own.backgroundImage !== "none") painted = true;
                const colour = parse(own.backgroundColor);
                if (colour.a === 1 && own.backgroundColor !== "rgba(0, 0, 0, 0)") {
                    behind = colour;
                    break;
                }
            }
            if (painted) continue;
            const [a, b] = [luminance(parse(style.color)), luminance(behind)].sort((x, y) => y - x);
            const ratio = ((a ?? 0) + 0.05) / ((b ?? 0) + 0.05);
            if (ratio < 4.5) {
                const name = `${element.tagName.toLowerCase()}.${element.className}`;
                found.add(`${name} "${node.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
            }
        }
        return [...found];
    });
}

test("marketing and sign-in text is at least 4.5:1", async ({ page }) => {
    for (const path of ["/", "/gallery", "/about", "/support", "/report", "/login", "/signup"]) {
        await page.goto(path);
        expect(await lowContrast(page), path).toEqual([]);
    }
});

test("app text, including the builder, is at least 4.5:1", async ({ page }) => {
    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    expect(await lowContrast(page), "/app/edit").toEqual([]);
    for (const path of ["/app", "/app/analytics", "/app/settings", "/app/account"]) {
        await page.goto(path);
        await page.locator(".ph h1").first().waitFor();
        expect(await lowContrast(page), path).toEqual([]);
    }
});
