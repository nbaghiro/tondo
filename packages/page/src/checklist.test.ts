import { describe, expect, it } from "vitest";
import { setupChecklist } from "./checklist";
import { readPage } from "./upgrade";
import { samplePage, starterPage } from "./samples";

describe("setup checklist", () => {
    it("starts mostly undone for a new page, with five items", () => {
        const items = setupChecklist(starterPage("Maya"), { published: false });
        expect(items.map((item) => item.id)).toEqual([
            "about",
            "photo",
            "socials",
            "content",
            "publish",
        ]);
        expect(items.find((item) => item.id === "publish")?.panel).toBe("publish");
        expect(items.filter((item) => item.done).map((item) => item.id)).toEqual(["content"]);
    });

    it("follows the page and whether it's live", () => {
        const items = setupChecklist(samplePage, { published: true });
        expect(items.find((item) => item.id === "about")?.done).toBe(true);
        expect(items.find((item) => item.id === "socials")?.done).toBe(true);
        expect(items.find((item) => item.id === "publish")?.done).toBe(true);
    });
});

describe("reading saved pages", () => {
    it("sets an unreadable block aside and keeps the rest", () => {
        const page = readPage({
            ...samplePage,
            blocks: [...samplePage.blocks, { id: "x", type: "gone-block", odd: 1 }],
        });
        expect(page.blocks).toHaveLength(samplePage.blocks.length);
        expect(page.unreadable).toEqual([{ id: "x", type: "gone-block", odd: 1 }]);
    });

    it("keeps what's valid in a damaged page, without throwing", () => {
        const page = readPage({
            version: 2,
            look: "no-such-look",
            title: "Kept",
            header: { name: "Maya", photo: 12, layout: "nope" },
            blocks: "nonsense",
            extra: true,
        });
        expect(page.look).toBe("madder");
        expect(page.title).toBe("Kept");
        expect(page.header.name).toBe("Maya");
        expect(page.blocks).toEqual([]);
    });

    it("reads an unversioned page, including a word for a position", () => {
        const page = readPage({
            look: "madder",
            header: { name: "Old", photo: "woman23", position: "center", social: [] },
            blocks: [
                {
                    id: "a",
                    type: "link-card",
                    variant: "small",
                    photo: "desk1",
                    position: "center top",
                    title: "T",
                    text: "",
                    url: "",
                },
            ],
        });
        expect(page.version).toBe(2);
        expect(page.header.photo?.file).toBe("woman23.jpg");
    });

    it("reads a version one page", () => {
        const page = readPage({
            version: 1,
            look: "madder",
            header: { layout: "look", name: "One", links: [] },
            blocks: [{ id: "h", type: "heading", variant: "plain", text: "Hi" }],
        });
        expect(page.blocks[0]?.section).toBe("h");
    });
});
