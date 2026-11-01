import { describe, expect, it } from "vitest";
import { publishIssues, publishWarnings } from "./publish";
import type { Block } from "./blocks";
import { newBlock } from "./operations";
import { liveContent } from "./sample-content";
import { makeSection, sectionAvailable, sectionDefinition, sectionDefinitions } from "./sections";
import { starterPage, samplePage } from "./samples";

describe("publishIssues", () => {
    it("mentions what couldn't be read when there's nothing else on the page", () => {
        const page = { ...starterPage("June"), unreadable: [{ type: "music" }] };
        expect(publishIssues(page)[0]?.message).toContain("couldn't be read");
    });

    it("accepts a finished page", () => {
        expect(publishIssues(samplePage)).toEqual([]);
    });

    it("asks for a name and a block", () => {
        const page = { ...starterPage(""), blocks: [] };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["header", "add"]);
    });

    it("finds an empty link, including inside a tab", () => {
        const button = newBlock("button", "inner");
        const tabs = newBlock("tabs", "t");
        if (tabs.type !== "tabs" || button.type !== "button") throw new Error("Wrong block.");
        const [first, second] = tabs.tabs;
        if (!first || !second) throw new Error("No tabs.");
        const page = {
            ...starterPage("June"),
            blocks: [
                {
                    ...tabs,
                    tabs: [{ ...first, blocks: [{ ...button, text: "My own" }] }, second],
                },
            ],
        };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["inner"]);
    });

    it("skips hidden blocks, and refuses held ones", () => {
        const hidden = { ...newBlock("button", "h"), hidden: true };
        const held = { ...newBlock("signup", "s"), title: "My own" } as Block;
        const page = { ...starterPage("June"), blocks: [hidden, held] };
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["s"]);
    });
});

describe("sample content", () => {
    const fresh = (key: string) => {
        const definition = sectionDefinition(key);
        if (!definition) throw new Error(`No section ${key}.`);
        let i = 0;
        return makeSection(definition, () => `id${String(i++)}`);
    };

    it("leaves out sections nobody has touched, and doesn't ask them to be fixed", () => {
        const page = { ...starterPage("June"), blocks: fresh("proof") };
        expect(liveContent(page).page.blocks).toEqual([]);
        expect(publishIssues(page).map((issue) => issue.target)).toEqual(["add"]);
        expect(publishWarnings(page).length).toBeGreaterThan(0);
    });

    it.each(sectionDefinitions.filter(sectionAvailable).map((definition) => definition.key))(
        "a fresh %s section shows nothing invented",
        (key) => {
            const page = { ...starterPage("June"), blocks: fresh(key) };
            const kept = liveContent(page).page.blocks;
            // Only ones with no words of their own can stay: a space, and paintings in a grid.
            for (const block of kept) expect(["divider", "gallery"]).toContain(block.type);
        },
    );

    it("keeps an item once it's been changed, and drops only the untouched ones", () => {
        const block = fresh("services").find((one) => one.type === "services");
        if (block?.type !== "services") throw new Error("Wrong block.");
        const [first, ...rest] = block.items;
        if (!first) throw new Error("No items.");
        const changed = { ...block, items: [{ ...first, name: "My own" }, ...rest] };
        const live = liveContent({ ...starterPage("June"), blocks: [changed] }).page.blocks[0];
        if (live?.type !== "services") throw new Error("Lost the block.");
        expect(live.items.map((entry) => entry.name)).toEqual(["My own"]);
    });

    it("keeps a sample's words once someone adds a link", () => {
        const [block] = fresh("links");
        if (block?.type !== "button") throw new Error("Wrong block.");
        const page = {
            ...starterPage("June"),
            blocks: [{ ...block, url: "https://example.com" }],
        };
        expect(liveContent(page).page.blocks).toHaveLength(1);
    });

    it("drops a section's title with its content, and empty tabs", () => {
        const tabs = newBlock("tabs", "t");
        const page = { ...starterPage("June"), blocks: [tabs] };
        expect(liveContent(page).page.blocks).toEqual([]);
    });

    it("names the section and item that need fixing", () => {
        const block = fresh("shop").find((one) => one.type === "products");
        if (block?.type !== "products") throw new Error("Wrong block.");
        const [first] = block.items;
        if (!first) throw new Error("No items.");
        const page = {
            ...starterPage("June"),
            blocks: [{ ...block, items: [{ ...first, name: "Vase", url: "" }] }],
        };
        const [issue] = publishIssues(page);
        expect(issue?.message).toContain("Shop");
        expect(issue?.message).toContain('"Vase"');
        expect(issue?.item).toBe(first.id);
    });
});
