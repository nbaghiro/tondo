import { samplePage } from "@tondo/page";
import { describe, expect, it } from "vitest";
import {
    addBlock,
    moveBlock,
    newBlock,
    removeBlock,
    setBlockField,
    setHeaderField,
} from "./document";
import { createHistory } from "./history";

const ids = (page: typeof samplePage) => page.blocks.map((block) => block.id);

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

describe("history", () => {
    it("undoes and redoes", () => {
        const history = createHistory<number>();
        history.record(1);
        expect(history.undo(2)).toBe(1);
        expect(history.redo(1)).toBe(2);
        expect(history.canRedo()).toBe(false);
    });

    it("groups quick changes to one thing into one step", () => {
        let time = 0;
        const history = createHistory<string>(() => time);
        history.record("", "title");
        time = 100;
        history.record("a", "title");
        time = 200;
        history.record("ab", "title");
        expect(history.undo("abc")).toBe("");
        expect(history.canUndo()).toBe(false);
    });

    it("starts a new step after a pause or on a different field", () => {
        let time = 0;
        const history = createHistory<string>(() => time);
        history.record("a", "title");
        time = 5000;
        history.record("b", "title");
        history.record("c", "other");
        expect(history.undo("d")).toBe("c");
        expect(history.undo("c")).toBe("b");
        expect(history.undo("b")).toBe("a");
    });

    it("forgets redo after a new change", () => {
        const history = createHistory<number>();
        history.record(1);
        history.undo(2);
        history.record(1);
        expect(history.canRedo()).toBe(false);
    });
});
