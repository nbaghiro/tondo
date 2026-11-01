import {
    exampleHandles,
    isReservedHandle,
    isValidHandle,
    PAGE_VERSION,
    readPage,
} from "@tondo/page";
import { describe, expect, it } from "vitest";
import examples from "./examples.json";

const documents = import.meta.glob<unknown>("./pages/*.json", { import: "default", eager: true });
const handleOf = (path: string) => path.replace(/^.*\/|\.json$/g, "");

describe("example pages", () => {
    it("have valid, unique addresses that can't be claimed", () => {
        const handles = examples.map((example) => example.handle);
        expect(new Set(handles).size).toBe(handles.length);
        for (const handle of handles) {
            expect(isValidHandle(handle)).toBe(true);
            expect(isReservedHandle(handle)).toBe(true);
        }
    });

    it("are each a saved page, and all reserved", () => {
        const paths = Object.keys(documents);
        expect(paths.length).toBe(examples.length + 2);
        expect(paths.map(handleOf).sort()).toEqual([...exampleHandles].sort());
        for (const path of paths) expect(readPage(documents[path]).version).toBe(PAGE_VERSION);
    });

    it("every gallery page has a document", () => {
        const handles = Object.keys(documents).map(handleOf);
        for (const example of examples) expect(handles).toContain(example.handle);
    });
});
