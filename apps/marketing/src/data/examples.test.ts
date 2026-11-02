import {
    allBlocks,
    liveContent,
    PAGE_VERSION,
    pageSchema,
    publishIssues,
    sectionsOf,
    sectionStatus,
} from "@tondo/page";
import type { Block, Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { describe, expect, it } from "vitest";
import { exampleHtml, GALLERY_DATE } from "../lib/pages";

const documents = import.meta.glob<unknown>("./pages/*.json", { import: "default", eager: true });
const photos = new Set(
    Object.keys(import.meta.glob("../../../../packages/brand/photos/*")).map((path) =>
        path.replace(/^.*\//, ""),
    ),
);
const examples = Object.entries(documents).map(
    ([path, raw]) => [path.replace(/^.*\/|\.json$/g, ""), raw] as const,
);
const strict = (raw: unknown): Page => pageSchema.parse(raw);

function filesIn(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(filesIn);
    if (typeof value !== "object" || value === null) return [];
    const { file } = value as { file?: unknown };
    return [...(typeof file === "string" ? [file] : []), ...Object.values(value).flatMap(filesIn)];
}

function expectSections(blocks: readonly Block[]) {
    for (const section of sectionsOf(blocks)) {
        const [first] = section.blocks;
        if (!first) throw new Error(`Section ${section.id} is only a title.`);
        expect(first.section).toBe(section.id);
        const { style } = section;
        const variants = [style.variant, ...(style.options?.choices.map(([id]) => id) ?? [])];
        expect(style.type).toBe(first.type);
        expect(variants).toContain(first.variant);
        // Only links share a section, in one style, so the style tile is true of all of them.
        if (section.definition.key !== "links") expect(section.blocks).toHaveLength(1);
        for (const block of section.blocks) {
            expect(block.type).toBe(first.type);
            expect(block.variant).toBe(first.variant);
            if (block.type === "tabs") for (const tab of block.tabs) expectSections(tab.blocks);
        }
    }
}

describe("example pages are ordinary pages", () => {
    it("has all 77", () => {
        expect(examples).toHaveLength(77);
    });

    it.each(examples)("%s", (handle, raw) => {
        const page = strict(raw);
        expect(page.version).toBe(PAGE_VERSION);
        expect(page).toEqual(raw);
        expect(page.unreadable).toBeUndefined();

        expect(allBlocks(page.blocks).every((block) => block.section)).toBe(true);
        expectSections(page.blocks);

        for (const file of filesIn(page)) expect(photos).toContain(file);

        // Nothing a person wrote is mistaken for sample words.
        const live = liveContent(page);
        expect(live.leftOut).toEqual([]);
        expect(live.page.blocks).toEqual(page.blocks);

        // Links not filled in and blocks that aren't ready are all that can stop one publishing.
        for (const { message } of publishIssues(page)) {
            expect(message).toMatch(/needs a link|isn't available yet/);
        }
        for (const section of sectionsOf(page.blocks)) {
            expect(sectionStatus(section) ?? "").not.toMatch(/live yet|photo|details/);
        }

        const person = {
            title: page.header.name,
            assetBase: "/photos/",
            editable: false,
            live: true,
            now: GALLERY_DATE,
        };
        expect(exampleHtml(page)).toBe(renderDocument(page, person));
        // Only counting clicks, the share tags and the report link set a real address apart.
        const address = renderDocument(page, {
            ...person,
            trackAs: handle,
            shareUrl: `https://tondo.page/${handle}`,
        });
        const bare = (html: string) =>
            html
                .replace(/<meta (property="og:|name="twitter:)[^>]*>/g, "")
                .replace(/<p style="[^"]*"><a href="\/report[^]*?<\/p>/, "")
                .replace(/<a ([^>]*)href="[^"]*"/g, "<a $1href");
        expect(bare(address)).toBe(bare(exampleHtml(page)));
    });
});
