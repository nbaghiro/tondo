import { isReservedHandle, isValidHandle } from "@tondo/page";
import { describe, expect, it } from "vitest";
import examples from "./examples.json";

describe("example page handles", () => {
    it("are valid, unique and can't be claimed", () => {
        const handles = examples.map((example) => example.handle);
        expect(new Set(handles).size).toBe(handles.length);
        for (const handle of handles) {
            expect(isValidHandle(handle)).toBe(true);
            expect(isReservedHandle(handle)).toBe(true);
        }
    });
});
