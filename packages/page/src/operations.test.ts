import { describe, expect, it } from "vitest";
import {
    addBlock,
    duplicateBlock,
    findBlock,
    moveBlock,
    newBlock,
    removeBlock,
    samplePage,
    setBlockField,
    setHeaderField,
} from "./index";
import type { Page } from "./index";

const ids = (page: Page) => page.blocks.map((block) => block.id);

describe("block operations", () => {
    it("adds at a position", () => {
        const page = addBlock(samplePage, newBlock("heading", "new"), 1);
        expect(ids(page)[1]).toBe("new");
        expect(page.blocks).toHaveLength(samplePage.blocks.length + 1);
    });

    it("moves a block and keeps the rest in order", () => {
        const page = moveBlock(samplePage, "sale", 2);
        expect(ids(page).slice(0, 3)).toEqual(["work", "vase", "sale"]);
    });

    it.each([-1, 99])("returns the same page for an impossible move to %i", (to) => {
        expect(moveBlock(samplePage, "sale", to)).toBe(samplePage);
    });

    it("removes a block", () => {
        expect(ids(removeBlock(samplePage, "sale"))).not.toContain("sale");
    });

    it("never changes the original page", () => {
        const before = JSON.stringify(samplePage);
        addBlock(samplePage, newBlock("button", "x"), 0);
        moveBlock(samplePage, "sale", 3);
        removeBlock(samplePage, "sale");
        setBlockField(samplePage, "work", "text", "Changed");
        expect(JSON.stringify(samplePage)).toBe(before);
    });

    it("sets a field", () => {
        const page = setBlockField(samplePage, "work", "text", "Changed");
        expect(page.blocks.find((block) => block.id === "work")).toHaveProperty("text", "Changed");
    });

    it("refuses a value the block doesn't allow", () => {
        const page = setBlockField(samplePage, "wheel", "url", "javascript:alert(1)");
        expect(page.blocks.find((block) => block.id === "wheel")).toHaveProperty(
            "url",
            "https://example.com/wheel",
        );
    });

    it("refuses a header value over its limit", () => {
        expect(setHeaderField(samplePage, "name", "x".repeat(81))).toBe(samplePage);
    });
});

describe("blocks inside tabs", () => {
    const heading = newBlock("heading", "inner");
    const tabs = newBlock("tabs", "tabs");
    const start = addBlock(samplePage, tabs, 0);
    const place = { tabs: "tabs", tab: "first" };
    const page = addBlock(
        addBlock(start, heading, 0, place),
        newBlock("button", "second"),
        1,
        place,
    );

    it("finds them, and knows where they live", () => {
        expect(findBlock(page, "inner")?.place).toEqual(place);
        expect(findBlock(page, "sale")?.place).toBeUndefined();
    });

    it("moves, edits and removes them in place", () => {
        const moved = moveBlock(page, "inner", 1);
        expect(findBlock(moved, "inner")?.index).toBe(1);
        const edited = setBlockField(page, "inner", "text", "Inside");
        expect(findBlock(edited, "inner")?.block).toHaveProperty("text", "Inside");
        expect(findBlock(removeBlock(page, "inner"), "inner")).toBeNull();
    });

    it("refuses tabs inside tabs", () => {
        expect(addBlock(page, newBlock("tabs", "more"), 0, place)).toBe(page);
    });

    it("gives a copy new ids, including everything inside it", () => {
        let n = 0;
        const [copied, id] = duplicateBlock(page, "tabs", () => `new${String(n++)}`);
        expect(id).toBeTruthy();
        expect(findBlock(copied, "inner")?.place?.tabs).toBe("tabs");
        const copy = copied.blocks[1];
        if (copy?.type !== "tabs") throw new Error("Expected the copy below the original.");
        expect(copy.tabs[0]?.blocks[0]?.id).not.toBe("inner");
    });
});

describe("empty values", () => {
    it("are left out when the block allows it", () => {
        const page = setBlockField(samplePage, "sale", "text", "");
        expect(findBlock(page, "sale")?.block).not.toHaveProperty("text");
    });

    it("stay when the block needs them", () => {
        const page = setBlockField(samplePage, "work", "text", "");
        expect(findBlock(page, "work")?.block).toHaveProperty("text", "");
    });

    it("leave nothing behind on the header", () => {
        expect(setHeaderField(samplePage, "bio", "").header).not.toHaveProperty("bio");
    });
});
