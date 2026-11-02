import { saveRequest } from "@tondo/contract";
import { findSection, pageSchema, sectionsOf } from "@tondo/page";
import type { Block, Page } from "@tondo/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEditor } from "./document";

const documents = import.meta.glob<unknown>("../../../marketing/src/data/pages/*.json", {
    import: "default",
    eager: true,
});
const examples = Object.entries(documents).map(
    ([path, raw]) => [path.replace(/^.*\/|\.json$/g, ""), raw] as const,
);

const open = (pageId: string, page: Page) =>
    createEditor({
        pageId,
        page,
        updatedAt: "2026-11-01T00:00:00Z",
        changed: false,
        onLoggedOut: () => undefined,
    });

const wordsField = (block: Block): string | undefined =>
    ["text", "title", "label", "address"].find(
        (key) => typeof (block as Record<string, unknown>)[key] === "string",
    );

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("example pages in the builder", () => {
    it("reads all 77", () => {
        expect(examples).toHaveLength(77);
    });

    it.each(examples)("%s edits, undoes and saves without losing anything", async (handle, raw) => {
        const page = pageSchema.parse(raw);
        const sent: unknown[] = [];
        vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
            sent.push(JSON.parse(init.body as string));
            return Promise.resolve(Response.json({ updatedAt: "2026-11-01T00:00:01Z" }));
        });
        const editor = open(handle, page);
        expect(editor.page()).toEqual(page);

        const sections = sectionsOf(page.blocks);
        const [first] = sections;
        if (!first) throw new Error("This page has no sections.");
        for (const section of sections) {
            expect(findSection(page, section.id)?.section.all).toEqual(section.all);
        }

        editor.setField("header", "name", "A new name");
        expect(editor.page().header.name).toBe("A new name");
        editor.setSectionTitle(first.id, "A new title");
        expect(sectionsOf(editor.page().blocks)[0]?.title?.text).toBe("A new title");
        const target = sections.flatMap((section) => section.blocks).find(wordsField);
        const key = target && wordsField(target);
        if (target && key) {
            editor.setField(target.id, key, "My own words");
            expect(findSection(editor.page(), target.id)?.section.all).toContainEqual(
                expect.objectContaining({ [key]: "My own words" }),
            );
        }
        if (sections.length > 1) editor.moveSection(first.id, 1);

        const edited = editor.page();
        pageSchema.parse(edited);
        while (editor.canUndo()) editor.undo();
        expect(editor.page()).toEqual(page);
        while (editor.canRedo()) editor.redo();
        expect(editor.page()).toEqual(edited);

        await editor.saver.flush();
        const saved = saveRequest.parse(sent.at(-1));
        expect(saved.page).toEqual(edited);
    });
});
