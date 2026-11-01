import { describe, expect, it } from "vitest";
import { blockDefinitions, blockTypes } from "./blocks";
import type { Block } from "./blocks";
import { samplePage } from "./samples";
import {
    addLinkToSection,
    addSection,
    duplicateSection,
    findSection,
    makeSection,
    moveSection,
    removeSection,
    sectionDefinition,
    sectionDefinitions,
    sectionsOf,
    sectionStatus,
    setSectionShared,
    setSectionStyle,
    setSectionTitle,
    styleAvailable,
} from "./sections";
import { publishIssues, publishWarnings } from "./publish";
import { readPage } from "./upgrade";
import { pageSchema } from "./schema";

let next = 0;
const makeId = () => `id${String(next++)}`;
const empty = { ...samplePage, blocks: [] as Block[] };
const definition = (key: string) => {
    const found = sectionDefinition(key);
    if (!found) throw new Error(key);
    return found;
};

describe("the catalogue", () => {
    it("reaches every layout of every block", () => {
        const reached = new Set(
            sectionDefinitions.flatMap((section) =>
                section.styles.flatMap((style) => [
                    `${style.type}:${style.variant}`,
                    ...(style.options?.choices.map(([v]) => `${style.type}:${v}`) ?? []),
                ]),
            ),
        );
        // A heading is the title of a section, and "Big title" is its large layout.
        reached.add("heading:plain").add("heading:large");
        const missing = blockTypes.flatMap((type) =>
            Object.keys(blockDefinitions[type].layouts)
                .map((variant) => `${type}:${variant}`)
                .filter((key) => !reached.has(key)),
        );
        expect(missing).toEqual([]);
    });

    it("offers 14 main sections and has a valid sample for every style", () => {
        expect(sectionDefinitions.filter((section) => !section.less)).toHaveLength(14);
        for (const section of sectionDefinitions) {
            for (const style of section.styles) {
                const blocks = section
                    .sample(style)
                    .map((seed, i) => ({ ...seed, id: `s${String(i)}`, section: "s" }));
                expect(() => pageSchema.parse({ ...empty, blocks })).not.toThrow();
            }
        }
    });

    it("marks what isn't built yet as unavailable", () => {
        const touch = definition("touch");
        expect(touch.styles.some(styleAvailable)).toBe(false);
        const bookings = definition("bookings").styles;
        expect(bookings.filter(styleAvailable).map((style) => style.id)).toEqual(["card"]);
    });
});

describe("sections on a page", () => {
    const withLinks = () => addSection(empty, makeSection(definition("links"), makeId), 0);

    it("groups blocks that share an id and takes a heading as the title", () => {
        const page = addSection(withLinks(), makeSection(definition("about"), makeId), 1);
        const sections = sectionsOf(page.blocks);
        expect(sections.map((s) => s.definition.key)).toEqual(["links", "about"]);
        expect(sections[0]?.blocks).toHaveLength(3);
        expect(sections[1]?.title?.text).toBe("A little about me");
        expect(sections[1]?.blocks).toHaveLength(1);
    });

    it("moves, copies and removes a section as one", () => {
        let page = addSection(withLinks(), makeSection(definition("about"), makeId), 1);
        const [links, about] = sectionsOf(page.blocks);
        page = moveSection(page, about?.id ?? "", 0);
        expect(sectionsOf(page.blocks).map((s) => s.definition.key)).toEqual(["about", "links"]);
        const [copied, copy] = duplicateSection(page, links?.id ?? "", makeId);
        expect(sectionsOf(copied.blocks).map((s) => s.definition.key)).toEqual([
            "about",
            "links",
            "links",
        ]);
        expect(copy).not.toBe(links?.id);
        const removed = removeSection(copied, links?.id ?? "");
        expect(sectionsOf(removed.blocks).map((s) => s.id)).toEqual([about?.id, copy]);
    });

    it("keeps links when their style changes kind, and changes back", () => {
        let page = withLinks();
        const id = sectionsOf(page.blocks)[0]?.id ?? "";
        page = addLinkToSection(page, id, makeId, "https://example.com", "My shop");
        page = setSectionStyle(page, id, "cards", makeId);
        const cards = findSection(page, id)?.section;
        expect(cards?.blocks.every((block) => block.type === "link-card")).toBe(true);
        page = setSectionStyle(page, id, "buttons", makeId);
        const buttons = findSection(page, id)?.section.blocks;
        expect(buttons?.at(-1)).toMatchObject({ type: "button", text: "My shop" });
    });

    it("won't switch to a style that isn't built", () => {
        const page = addSection(empty, makeSection(definition("bookings"), makeId), 0);
        const id = sectionsOf(page.blocks)[0]?.id ?? "";
        expect(setSectionStyle(page, id, "slots", makeId)).toBe(page);
    });

    it("adds and removes a title, and shows or hides every block together", () => {
        let page = addSection(empty, makeSection(definition("photos"), makeId), 0);
        const id = sectionsOf(page.blocks)[0]?.id ?? "";
        page = setSectionTitle(page, id, "My work", makeId);
        expect(findSection(page, id)?.section.title?.text).toBe("My work");
        page = setSectionShared(page, id, "hidden", true);
        expect(page.blocks.every((block) => block.hidden)).toBe(true);
        page = setSectionTitle(page, id, "", makeId);
        expect(findSection(page, id)?.section.title).toBeUndefined();
    });

    it("says what's left to do, and publishing blocks dead links but only warns on paintings", () => {
        let page = addSection(empty, makeSection(definition("spotlight"), makeId), 0);
        const section = sectionsOf(page.blocks)[0];
        expect(section && sectionStatus(section)).toBe("Add a photo");
        expect(publishIssues(page).some((issue) => issue.message.includes("needs a link"))).toBe(
            true,
        );
        page = {
            ...page,
            blocks: page.blocks.map((block) =>
                block.type === "link-card" ? { ...block, url: "https://example.com" } : block,
            ),
        };
        expect(publishIssues(page)).toEqual([]);
        expect(publishWarnings(page)).toHaveLength(1);
    });
});

describe("older pages", () => {
    it("get sections from their headings and runs of links", () => {
        const page = readPage({ ...samplePage, version: 1 });
        const keys = sectionsOf(page.blocks).map((s) => s.definition.key);
        expect(keys).toEqual(["spotlight", "links", "links"]);
        expect(sectionsOf(page.blocks)[1]?.title?.text).toBe("New work");
    });
});
