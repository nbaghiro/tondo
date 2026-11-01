import { describe, expect, it } from "vitest";
import { publishIssues } from "./publish";
import { newBlock } from "./operations";
import { starterPage, samplePage } from "./samples";

describe("publishIssues", () => {
    it("accepts a finished page", () => {
        expect(publishIssues(samplePage)).toEqual([]);
    });

    it("asks for a name and a block", () => {
        const page = { ...starterPage(""), blocks: [] };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["header", "page"]);
    });

    it("finds an empty link, including inside a tab", () => {
        const button = newBlock("button", "inner");
        const tabs = newBlock("tabs", "t");
        if (tabs.type !== "tabs" || button.type !== "button") throw new Error("Wrong block.");
        const [first, second] = tabs.tabs;
        if (!first || !second) throw new Error("No tabs.");
        const page = {
            ...starterPage("June"),
            blocks: [{ ...tabs, tabs: [{ ...first, blocks: [button] }, second] }],
        };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["inner"]);
    });

    it("skips hidden blocks, and refuses held ones", () => {
        const hidden = { ...newBlock("button", "h"), hidden: true };
        const held = newBlock("signup", "s");
        const page = { ...starterPage("June"), blocks: [hidden, held] };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["s"]);
    });
});
