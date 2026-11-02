import { describe, expect, it } from "vitest";

const documents = import.meta.glob<unknown>("./pages/*.json", { import: "default", eager: true });

function emptyLinks(value: unknown, path: string): string[] {
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).flatMap(([key, entry]) => {
        const at = `${path}.${key}`;
        if (["url", "buttonUrl", "value"].includes(key) && entry === "") return [at];
        return emptyLinks(entry, at);
    });
}

describe("example page links", () => {
    // A live page leaves out a button with no link, so an example would lose it without any error.
    it("are all filled in", () => {
        const empty = Object.entries(documents).flatMap(([path, page]) => emptyLinks(page, path));
        expect(empty).toEqual([]);
    });
});
