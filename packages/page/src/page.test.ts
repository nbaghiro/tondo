import { PAGE_VERSION } from "./schema";
import { describe, expect, it } from "vitest";
import {
    handleSchema,
    isReservedHandle,
    isSafeUrl,
    normaliseHandle,
    pageSchema,
    publishWarnings,
    readLink,
    readPage,
    samplePage,
    upgradePage,
} from "./index";

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

describe("reading a link", () => {
    it.each([
        ["shop.example.com", "https://shop.example.com", "globe"],
        ["https://instagram.com/maya", "https://instagram.com/maya", "instagram"],
        ["maya@example.com", "mailto:maya@example.com", "mail"],
        ["604 555 0142", "tel:6045550142", "phone"],
    ])("understands %s", (raw, url, icon) => {
        expect(readLink(raw)).toMatchObject({ state: "ok", url, icon });
    });

    it.each(["javascript:alert(1)", "data:text/html,x", "not a link"])("refuses %s", (raw) => {
        expect(readLink(raw).state).toBe("bad");
    });

    it("doesn't take another site for a known service", () => {
        expect(readLink("notinstagram.com/x")).toMatchObject({ icon: "globe" });
    });
});

describe("saved documents", () => {
    it("upgrade from before versions", () => {
        const old = {
            look: "madder",
            header: {
                name: "A",
                tagline: "",
                bio: "",
                photo: "woman23",
                position: "50% 22%",
                zoom: 1.8,
                social: [{ network: "mail", url: "mailto:a@b.co" }],
            },
            blocks: [
                {
                    id: "x",
                    type: "link-card",
                    variant: "small",
                    photo: "ceramic0",
                    title: "T",
                    text: "D",
                    url: "",
                },
            ],
        };
        const page = readPage(old);
        expect(page.version).toBe(PAGE_VERSION);
        expect(page.header.photo).toEqual({ file: "woman23.jpg", x: 50, y: 22, zoom: 1.8 });
        expect(page.header.links[0]?.value).toBe("mailto:a@b.co");
        expect(page.blocks[0]).toMatchObject({ photo: { file: "ceramic0.jpg" } });
    });

    it("are left alone when they're current", () => {
        expect(upgradePage(samplePage)).toBe(samplePage);
    });
});

describe("review fixes", () => {
    it("refuses a made-up time zone and reads a saved one without losing the page", () => {
        const good = { ...samplePage, timeZone: "Asia/Tokyo" };
        expect(pageSchema.safeParse(good).success).toBe(true);
        const bad = { ...samplePage, timeZone: "Mars/Olympus" };
        expect(pageSchema.safeParse(bad).success).toBe(false);
        expect(readPage(bad).timeZone).toBeUndefined();
        expect(readPage(bad).blocks.length).toBe(samplePage.blocks.length);
    });

    it("reserves addresses that could pass for Tondo", () => {
        for (const handle of [
            "no-reply",
            "postmaster",
            "sign-in",
            "tondo-help",
            "t0ndo",
            "tond0-x",
        ]) {
            expect(isReservedHandle(handle), handle).toBe(true);
        }
        expect(isReservedHandle("tondoki")).toBe(false);
    });

    it("names what couldn't be read, and tells repeated warnings apart", () => {
        const unread = { ...samplePage, unreadable: [{ type: "music" }, { type: "music" }] };
        const messages = publishWarnings(unread).map((issue) => issue.message);
        expect(messages.some((message) => message.includes("a Music section"))).toBe(true);
        expect(new Set(messages).size).toBe(messages.length);
    });
});
