import { describe, expect, it } from "vitest";
import { createHistory } from "./history";

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
