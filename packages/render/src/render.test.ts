import {
    everyLayoutPage,
    lookNames,
    makeSection,
    samplePage,
    sectionAvailable,
    sectionDefinition,
    sectionDefinitions,
} from "@tondo/page";
import type { LookName, Page } from "@tondo/page";
import { describe, expect, it } from "vitest";
import {
    headerArtChoices,
    photoStandIns,
    contrast as ratio,
    fontsHref,
    looks,
    paint,
    renderBody,
    renderCss,
    renderDocument,
    themeOf,
} from "./index";

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
        url: "https://example.com",
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
        expect(pair("mut", bg), "quiet text on the page").toBeGreaterThanOrEqual(4.5);
        expect(pair("btnfg", button), "button text").toBeGreaterThanOrEqual(4.5);
    });

    it("only has rules for things blocks and its header can draw", () => {
        const html = renderDocument(everyLayoutPage(name as LookName), {
            ...options,
            editable: true,
        }).replace(/<style[\s\S]*?<\/style>/g, "");
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

describe("a page's own style", () => {
    const styled = (style: NonNullable<Page["style"]>, look: Page["look"] = "madder"): Page => ({
        ...samplePage,
        look,
        style,
    });

    it("adds nothing when there are no choices", () => {
        expect(renderCss(samplePage)).not.toContain("html.look.madder{");
    });

    it("applies colour, font, shape and fill through the page's CSS", () => {
        const css = renderCss(
            styled({
                colour: { mode: "brand", brand: "#2563eb" },
                font: "modern",
                shape: "soft",
                fill: "outline",
            }),
        );
        expect(css).toContain("html.look.madder{");
        expect(css).toContain('--disp:"Space Grotesk"');
        expect(css).toContain("--rb:12px");
        expect(css).toContain("border:1.5px solid var(--btn)");
    });

    it("loads a chosen font pair and wordmark fonts, and no script", () => {
        const page: Page = {
            ...styled({ font: "friendly" }),
            header: { ...samplePage.header, wordmark: "bubble" },
        };
        expect(fontsHref(page)).toContain("Fredoka");
        expect(fontsHref(page)).toContain("Bagel+Fat+One");
        const html = renderDocument(page, { title: "t", assetBase: "/photos/", editable: false });
        expect(html).not.toContain("<script");
        expect(html).toContain('class="wm wm-bubble"');
    });

    it("keeps every look's main text readable in every colour choice", () => {
        for (const name of lookNames) {
            for (const colour of [
                { mode: "brand", brand: "#ffe100" },
                { mode: "brand", brand: "#123456" },
                { mode: "plain", brand: "#a42a55" },
                { mode: "dark", brand: "#a42a55" },
            ] as const) {
                const theme = themeOf({ look: name, style: { colour } });
                const v = theme?.vars ?? {};
                expect(ratio(v["--fg"] ?? "", v["--bg"] ?? "")).toBeGreaterThanOrEqual(4.5);
                expect(ratio(v["--mut"] ?? "", v["--bg"] ?? "")).toBeGreaterThanOrEqual(4.5);
                expect(ratio(v["--cardfg"] ?? "", v["--card"] ?? "")).toBeGreaterThanOrEqual(4.5);
                expect(ratio(v["--btnfg"] ?? "", v["--btn"] ?? "")).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it("corrects a look's own hard-coded text colours in the CSS", () => {
        const css = lookCssFor("conf");
        expect(css).toContain("!important");
    });

    it("draws placeholders as quiet tiles and the wave with no script", () => {
        const page: Page = {
            ...samplePage,
            blocks: [
                { id: "a", type: "image", variant: "framed", photo: { file: "paint-2" } },
                {
                    id: "b",
                    type: "ribbon",
                    variant: "wave",
                    text: "Hello",
                    section: "b",
                    tint: true,
                },
            ],
        };
        const html = renderDocument(page, { title: "t", assetBase: "/photos/", editable: false });
        expect(html).toContain('src="data:image/svg+xml');
        expect(html).not.toContain("feTurbulence%22%20");
        expect(html).toContain("<animate");
        expect(html).toContain('class="b-tint"');
    });
});

function lookCssFor(look: Page["look"]): string {
    return renderCss({
        ...samplePage,
        look,
        style: { colour: { mode: "brand", brand: "#ffe100" } },
    });
}

describe("a live page", () => {
    const live = (page: Page) =>
        renderDocument(page, { title: "t", assetBase: "/photos/", editable: false, live: true });

    it("never recolours a person's words or links", () => {
        const page: Page = {
            ...samplePage,
            look: "surf",
            style: { colour: { mode: "brand", brand: "#0f766e" } },
            header: {
                ...samplePage.header,
                layout: "look",
                bio: "Pantone #ff0000 or rgb(1,2,3)",
                links: [{ id: "l", type: "globe", value: "https://x.com/p#abc123" }],
            },
        };
        const html = renderBody(page, { assetBase: "/photos/", editable: false });
        expect(html).toContain("Pantone #ff0000 or rgb(1,2,3)");
        expect(html).toContain("https://x.com/p#abc123");
    });

    it("links a quoted address to the address itself", () => {
        const page: Page = {
            ...samplePage,
            blocks: [
                { id: "t", type: "text", variant: "plain", text: 'Read "https://a.com/x" now' },
            ],
        };
        expect(live(page)).toContain('href="https://a.com/x"');
        expect(live(page)).toContain("&quot;");
    });

    it("has no link that goes nowhere, whatever sections it holds", () => {
        const body = (blocks: Page["blocks"]) => live({ ...samplePage, blocks });
        // Every available section, with its words changed so they count as the person's own.
        const own = (value: unknown): unknown => {
            if (Array.isArray(value)) return value.map(own);
            if (typeof value !== "object" || value === null) return value;
            return Object.fromEntries(
                Object.entries(value).map(([key, inner]) => [
                    key,
                    ["name", "title", "text", "date"].includes(key)
                        ? `Mine ${String(inner)}`
                        : own(inner),
                ]),
            );
        };
        const blocks = sectionDefinitions.filter(sectionAvailable).flatMap((definition) => {
            let i = 0;
            return makeSection(definition, () => `${definition.key}${String(i++)}`);
        });
        const html = body(own(blocks) as Page["blocks"]);
        expect(html).toContain("Mine");
        expect(html).not.toContain('href="#"');
    });

    it("hides empty tabs and untouched sample sections", () => {
        const definition = sectionDefinition("proof");
        if (!definition) throw new Error("No section.");
        let i = 0;
        const blocks = makeSection(definition, () => `p${String(i++)}`);
        const html = live({
            ...samplePage,
            blocks: [
                ...blocks,
                {
                    id: "t",
                    type: "tabs",
                    variant: "pills",
                    tabs: [{ id: "a", label: "Shop", blocks: [] }],
                },
            ],
        });
        expect(html).not.toContain("b-tabs");
        expect(html).not.toContain("b-quote");
    });
});

describe("missing photos", () => {
    const seeded: Page = {
        ...samplePage,
        header: { ...samplePage.header, layout: "centred", photo: { file: "paint-1" } },
        blocks: [
            { id: "a", type: "image", variant: "framed", photo: { file: "paint-2" } },
            {
                id: "b",
                type: "gallery",
                variant: "grid",
                photos: [
                    { id: "p", file: "paint-3" },
                    { id: "q", file: "real.jpg" },
                ],
            },
            {
                id: "c",
                type: "link-card",
                variant: "large",
                title: "Mine",
                url: "https://a.example.com",
                photo: { file: "paint-4" },
            },
            {
                id: "d",
                type: "team",
                variant: "circles",
                items: [
                    { id: "i", name: "Ana", role: "Owner", url: "", photo: { file: "paint-5" } },
                ],
            },
        ],
    };
    const tiles = (html: string) => html.split('src="data:image/svg+xml').length - 1;
    const draw = (page: Page, editable: boolean, live: boolean) =>
        renderBody(page, { assetBase: "/photos/", editable, live });

    it("shows a tile for every one while editing, with a hint only there", () => {
        const html = draw(seeded, true, false);
        expect(tiles(html)).toBe(5);
        expect(html).toContain('title="Add a photo"');
    });

    it("leaves them out of live pages where it can, and keeps the tile where it can't", () => {
        const html = draw(seeded, false, true);
        expect(tiles(html)).toBe(1);
        expect(html).not.toContain('title="Add a photo"');
        expect(html).not.toContain("b-img");
        expect(html).not.toContain("b-fi");
        expect(html).toContain("real.jpg");
        expect(html).toContain("Mine");
    });

    it("takes its tint from the look, on light and dark", () => {
        const decode = (look: Page["look"]) =>
            decodeURIComponent(photoStandIns({ ...seeded, look }).placeholder(1));
        const fill = (svg: string) => /fill="(#[0-9a-f]{6})"/.exec(svg)?.[1] ?? "";
        const level = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);
        expect(decode("madder")).not.toContain("feTurbulence");
        expect(level(fill(decode("madder")))).toBeGreaterThan(180);
        expect(level(fill(decode("noir")))).toBeLessThan(90);
    });

    it("keeps the painting in a painted wordmark", () => {
        const page: Page = { ...seeded, header: { ...seeded.header, wordmark: "paint" } };
        expect(draw(page, false, true)).toContain("wm-paint");
        expect(draw(page, false, true)).toContain("feTurbulence");
    });
});

describe("header choices", () => {
    const body = (page: Page, editable = false) =>
        renderBody(page, { assetBase: "/photos/", editable });

    it("keeps a hidden name for screen readers and drops it when empty", () => {
        const hidden: Page = { ...samplePage, header: { ...samplePage.header, hideName: true } };
        expect(body(hidden)).toContain(`<h1 class="t-vh">${samplePage.header.name}</h1>`);
        const empty: Page = { ...hidden, header: { ...hidden.header, name: "" } };
        expect(body(empty)).not.toContain("<h1");
    });

    it("draws no name and no wordmark for every look when it's hidden", () => {
        for (const look of lookNames) {
            const page: Page = {
                ...samplePage,
                look,
                header: {
                    ...samplePage.header,
                    layout: "look",
                    wordmark: "seal",
                    hideName: true,
                },
            };
            expect(body(page)).not.toContain('class="wm ');
        }
    });

    it("removes the painting when the art is None, and offers only what a page can use", () => {
        const none: Page = { ...samplePage, look: "madder", style: { bg: "solid" } };
        expect(body(none)).not.toContain("feTurbulence");
        const banner: Page = {
            ...samplePage,
            header: { ...samplePage.header, layout: "banner" },
        };
        expect(headerArtChoices(banner)).toEqual({ paint: false, none: false });
        const centred: Page = {
            ...samplePage,
            header: { ...samplePage.header, layout: "centred" },
        };
        expect(headerArtChoices(centred)).toEqual({ paint: true, none: true });
    });
});
