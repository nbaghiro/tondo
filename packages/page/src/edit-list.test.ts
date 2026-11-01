import { describe, expect, it } from "vitest";
import { editList } from "./edit-list";
import { tryBlockField, tryHeaderField } from "./explain";
import { addFromLink } from "./add-link";
import { setLook, setStyle } from "./page-settings";
import { samplePage } from "./samples";
import type { Block } from "./blocks";
import type { Page } from "./schema";

let n = 0;
const makeId = () => `new${String(++n)}`;

const services: Block = {
    id: "s",
    type: "services",
    variant: "list",
    items: [
        { id: "a", name: "Cut", url: "" },
        { id: "b", name: "Fade", url: "" },
    ],
};
const page: Page = { ...samplePage, blocks: [services] };
const names = (next: Page) => {
    const block = next.blocks[0];
    return block?.type === "services" ? block.items.map((row) => row.name) : [];
};

describe("editList", () => {
    it("adds, updates, removes and reorders by id", () => {
        const done = editList(
            page,
            "s",
            "items",
            {
                add: [{ after: "a", values: { name: "Shave", url: "" } }],
                update: [{ id: "b", values: { name: "Long fade" } }],
                order: ["b"],
            },
            makeId,
        );
        expect(done.ok && names(done.page)).toEqual(["Long fade", "Cut", "Shave"]);
    });

    it("gives a reason a model can act on", () => {
        const done = editList(
            page,
            "s",
            "items",
            { update: [{ id: "a", values: { name: "x".repeat(41) } }] },
            makeId,
        );
        expect(done).toEqual({
            ok: false,
            error: "items.name is over its limit of 40 characters. Shorten it.",
        });
        expect(editList(page, "s", "items", { remove: ["zz"] }, makeId)).toEqual({
            ok: false,
            error: "items has no row zz.",
        });
        expect(editList(page, "s", "cta", {}, makeId).ok).toBe(false);
    });
});

describe("explained setters", () => {
    it("says why a value was refused", () => {
        expect(tryBlockField(page, "s", "variant", "wall")).toMatchObject({ ok: false });
        expect(tryBlockField(page, "zz", "cta", "Go")).toEqual({
            ok: false,
            error: "There's no block zz.",
        });
        const long = tryHeaderField(page, "name", "x".repeat(81));
        expect(long).toEqual({
            ok: false,
            error: "name is over its limit of 80 characters. Shorten it.",
        });
    });

    it("passes a good value through", () => {
        const done = tryHeaderField(page, "tagline", "Hello");
        expect(done.ok && done.page.header.tagline).toBe("Hello");
    });
});

describe("page settings", () => {
    it("keeps a brand colour across looks, and drops the rest", () => {
        const styled = setStyle(page, {
            colour: { mode: "brand", brand: "#0a8f5c" },
            shape: "soft",
        });
        expect(setLook(styled, "surf").style).toEqual({
            colour: { mode: "brand", brand: "#0a8f5c" },
        });
    });
});

describe("addFromLink", () => {
    it("makes a section once, then reuses it", () => {
        const empty: Page = { ...page, blocks: [] };
        const first = addFromLink(empty, "https://lowtide.example.com", makeId);
        expect(first?.made).toBe(true);
        const second = first && addFromLink(first.page, "https://other.example.com", makeId);
        expect(second?.made).toBe(false);
        expect(addFromLink(empty, "javascript:alert(1)", makeId)).toBeNull();
    });
});
