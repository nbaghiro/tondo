import { samplePage } from "@tondo/page";
import type { Page } from "@tondo/page";
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
