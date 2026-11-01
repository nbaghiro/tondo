import { blockDefinitions, blockTypes, liveContent, pageSchema, samplePage } from "@tondo/page";
import type { Block, Page } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { findLink, renderDocument } from "./document";

const live = (page: Page) =>
    renderDocument(page, { title: "t", assetBase: "/photos/", editable: false, live: true });

const words = (id: string): Block => ({
    id,
    type: "text",
    variant: "plain",
    text: `Words of my own ${id}`,
});

const withTabs = (first: Block[], second: Block[]): Page => ({
    ...samplePage,
    blocks: [
        {
            id: "tabs",
            type: "tabs",
            variant: "pills",
            tabs: [
                { id: "a", label: "Shop", blocks: first },
                { id: "b", label: "About", blocks: second },
            ],
        },
    ] as Page["blocks"],
});

describe("what goes live", () => {
    it("draws one surviving tab as its blocks, with no tab bar", () => {
        const html = live(withTabs([], [words("x")]));
        expect(html).toContain("Words of my own x");
        expect(html).not.toContain("b-tabbar");
    });

    it("keeps the tab bar while two tabs have something in them", () => {
        expect(live(withTabs([words("x")], [words("y")]))).toContain("b-tabbar");
    });

    it("draws nothing for tabs that are all empty", () => {
        expect(live(withTabs([], []))).not.toContain("b-tabs");
    });

    it("finds links in a surviving tab", () => {
        const button = {
            id: "go",
            type: "button",
            variant: "filled",
            text: "My own button",
            url: "https://example.com/mine",
        } as Block;
        const { page } = liveContent(withTabs([], [button]));
        expect(page.blocks.map((block) => block.type)).toEqual(["button"]);
        expect(html(withTabs([], [button]))).toContain("https://example.com/mine");
    });

    it("always gives a page that passes its own schema, for every block", () => {
        for (const type of blockTypes) {
            for (const variant of Object.keys(blockDefinitions[type].layouts)) {
                const block = {
                    ...blockDefinitions[type].make(),
                    id: "b",
                    type,
                    variant,
                } as Block;
                const page = { ...samplePage, blocks: [block] } as Page;
                expect(pageSchema.safeParse(liveContent(page).page).success).toBe(true);
                expect(() => live(page)).not.toThrow();
                expect(() => findLink(page, "none")).not.toThrow();
            }
        }
    });

    it("leaves out a block that can't be drawn, and says so", () => {
        const broken = JSON.parse('{"id":"b","type":"text","variant":"plain"}') as Block;
        const failed: string[] = [];
        const html = renderDocument(
            { ...samplePage, blocks: [broken, words("x")] },
            {
                title: "t",
                assetBase: "/photos/",
                editable: false,
                onDrawError: (type) => failed.push(type),
            },
        );
        expect(html).toContain("Words of my own x");
        expect(failed).toEqual(["text"]);
    });
});

const html = live;
