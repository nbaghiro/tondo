import { describe, expect, it } from "vitest";
import { handleSchema, isSafeUrl, normaliseHandle, pageSchema, samplePage } from "./index";

describe("handles", () => {
    it("normalises before validating", () => {
        expect(normaliseHandle("  Maya ")).toBe("maya");
    });

    it.each(["junebell", "aster-and-bell", "a", "m4ya"])("accepts %s", (handle) => {
        expect(handleSchema.safeParse(handle).success).toBe(true);
    });

    it.each(["", "-maya", "maya-", "Maya", "ma ya", "a".repeat(31), "api", "app", "l", "photos"])(
        "rejects %j",
        (handle) => {
            expect(handleSchema.safeParse(handle).success).toBe(false);
        },
    );
});

describe("links", () => {
    it.each(["https://a.co", "http://a.co", "mailto:a@b.co"])("allows %s", (url) => {
        expect(isSafeUrl(url)).toBe(true);
    });

    it.each([
        "javascript:alert(1)",
        "java\nscript:alert(1)",
        "https://a.co\n",
        "https://",
        "//a.co",
        "data:text/html,x",
        "JaVaScRiPt:alert(1)",
        "not a url",
        "",
    ])("blocks %j", (url) => {
        expect(isSafeUrl(url)).toBe(false);
    });
});

describe("pages", () => {
    it("accepts the sample page", () => {
        expect(pageSchema.parse(samplePage)).toEqual(samplePage);
    });

    it("rejects unknown fields", () => {
        expect(pageSchema.safeParse({ ...samplePage, extra: true }).success).toBe(false);
    });

    it("rejects a look that doesn't exist", () => {
        expect(pageSchema.safeParse({ ...samplePage, look: "nope" }).success).toBe(false);
    });
});
