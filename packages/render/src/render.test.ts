import { everyLayoutPage, samplePage } from "@tondo/page";
import type { LookName, Page } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { paint, renderBody, renderDocument, looks } from "./index";

const ctx = { assetBase: "/photos/", editable: false };
const options = { ...ctx, title: "Maya" };

describe("renderDocument", () => {
    it("renders the header and every block", () => {
        const html = renderDocument(samplePage, options);
        expect(html).toContain("Maya Okafor");
        expect(html).toContain("The autumn studio sale");
        expect(html).toContain('href="https://example.com/wheel"');
    });

    it("sends no script and no editor attributes to the visitor", () => {
        const html = renderDocument(samplePage, options);
        expect(html).not.toContain("<script");
        expect(html).not.toContain("data-field");
        expect(html).not.toContain("data-block-id");
    });

    it("includes only the blocks the page uses", () => {
        const html = renderDocument({ ...samplePage, blocks: [] }, options);
        expect(html).not.toContain(".b-thumb");
        expect(renderDocument(samplePage, options)).toContain(".b-thumb");
    });

    it("includes only the page's own look", () => {
        const html = renderDocument(samplePage, options);
        expect(html).toContain(".madder{");
        expect(html).not.toContain(".dusk{");
    });

    it("escapes the header and the title", () => {
        const page: Page = {
            ...samplePage,
            header: { ...samplePage.header, name: "<script>x</script>" },
        };
        const html = renderDocument(page, { ...options, title: "</title><script>" });
        expect(html).not.toContain("<script");
    });

    it("is the same every time, because the editor compares output", () => {
        expect(renderDocument(samplePage, options)).toBe(renderDocument(samplePage, options));
    });
});

describe("showing blocks", () => {
    const button = {
        id: "b",
        type: "button" as const,
        variant: "filled" as const,
        text: "Sale",
        url: "",
    };
    const body = (block: Page["blocks"][number], editable = false) =>
        renderBody(
            { ...samplePage, blocks: [block] },
            { ...ctx, editable },
            new Date("2026-06-01T00:00:00Z"),
        );

    it("leaves out hidden blocks, but keeps them in the editor", () => {
        expect(body({ ...button, hidden: true })).not.toContain("Sale");
        expect(body({ ...button, hidden: true }, true)).toContain("Sale");
    });

    it("respects the dates", () => {
        expect(body({ ...button, showFrom: "2026-07-01T00:00:00Z" })).not.toContain("Sale");
        expect(body({ ...button, showUntil: "2026-05-01T00:00:00Z" })).not.toContain("Sale");
        expect(body({ ...button, showFrom: "2026-05-01T00:00:00Z" })).toContain("Sale");
    });
});

describe("looks", () => {
    it("each defines the variables blocks depend on", () => {
        for (const look of Object.values(looks)) {
            for (const variable of [
                "--bg",
                "--fg",
                "--btn",
                "--card",
                "--disp",
                "--body",
                "--sel",
            ]) {
                expect(look.css).toContain(`${variable}:`);
            }
        }
    });
});

describe("paint", () => {
    it("draws the same picture for the same seed and a different one otherwise", () => {
        const palette = looks.madder.palette;
        expect(paint(palette, 5)).toBe(paint(palette, 5));
        expect(paint(palette, 5)).not.toBe(paint(palette, 6));
    });
});

const parseColour = (raw: string, under: readonly number[]): number[] => {
    const value = raw.trim();
    const hex = /^#([0-9a-f]{3,6})$/i.exec(value)?.[1];
    if (hex) {
        const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
        return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    }
    const rgba = /rgba?\(([^)]+)\)/.exec(value)?.[1]?.split(",").map(Number);
    if (rgba) {
        const alpha = rgba[3] ?? 1;
        return [0, 1, 2].map((i) => (rgba[i] ?? 0) * alpha + (under[i] ?? 0) * (1 - alpha));
    }
    return [...under];
};
const luminance = (rgb: readonly number[]) => {
    const [r = 0, g = 0, b = 0] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: readonly number[], b: readonly number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

describe.each(Object.entries(looks))("the %s look", (name, look) => {
    const read = (variable: string) =>
        new RegExp(`\\.${name}\\{[^}]*--${variable}:([^;}]+)`).exec(look.css)?.[1];

    it("has readable text", () => {
        const bg = parseColour(read("bg") ?? "#fff", [255, 255, 255]);
        const card = parseColour(read("card") ?? "transparent", bg);
        const pair = (text: string, on: readonly number[]) =>
            contrast(parseColour(read(text) ?? "", on), on);
        const button = parseColour(read("btn") ?? "", bg);
        expect(pair("fg", bg), "text on the page").toBeGreaterThanOrEqual(4.5);
        expect(pair("cardfg", card), "text on a card").toBeGreaterThanOrEqual(4.5);
        expect(pair("mut", bg), "quiet text on the page").toBeGreaterThanOrEqual(3.5);
        expect(pair("btnfg", button), "button text").toBeGreaterThanOrEqual(3.5);
    });

    it("only has rules for things blocks and its header can draw", () => {
        const html = renderDocument(everyLayoutPage(name as LookName), options).replace(
            /<style[\s\S]*?<\/style>/g,
            "",
        );
        const known = new Set(
            [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => (m[1] ?? "").split(/\s+/)),
        );
        const selectors = look.css
            .replace(/\{[^}]*\}/g, ",")
            .split(",")
            .filter((selector) => !selector.includes(":is("));
        const missing = selectors.flatMap((selector) =>
            [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)]
                .map((m) => m[1] ?? "")
                .filter((token) => !known.has(token) && !/^(t|p|l)\d$|^on$/.test(token)),
        );
        expect(missing).toEqual([]);
    });
});
