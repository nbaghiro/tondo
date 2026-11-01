import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { PLANS } from "./limits";
import { paidUses } from "./paid-uses";
import type { Page } from "./schema";
import { makeSection, sectionDefinition } from "./sections";
import { starterPage } from "./samples";

let next = 0;
const id = () => `b${String(next++)}`;
const sectionsFor = (key: string): Block[] => {
    const definition = sectionDefinition(key);
    if (!definition) throw new Error(key);
    return makeSection(definition, id);
};
const page = (extra: Partial<Page> = {}): Page => ({
    ...starterPage("June"),
    look: "madder",
    ...extra,
});
const codes = (subject: Page, live: Page | null = null, limits = PLANS.free) =>
    paidUses(subject, limits, live, (look) => look).map((use) => use.code);

const text = (body = "Mine"): Block => ({
    id: id(),
    type: "text",
    variant: "plain",
    section: id(),
    text: body,
});
const shop = (): Block => ({
    id: id(),
    type: "products",
    variant: "grid",
    section: id(),
    items: [
        {
            id: "1",
            name: "A vase",
            price: "$4",
            url: "https://x.example",
            photo: { file: "a.jpg" },
        },
    ],
});

describe("paidUses", () => {
    it("finds nothing on a free page, or on Pro", () => {
        expect(codes(page({ blocks: [text()] }))).toEqual([]);
        const fancy = page({ look: "bake", blocks: [shop()], style: { font: "bold" } });
        expect(codes(fancy, null, PLANS.pro)).toEqual([]);
    });

    it("finds each design choice", () => {
        expect(codes(page({ look: "bake" }))).toEqual(["look"]);
        const colour = { mode: "brand" as const, brand: "#112233" };
        expect(codes(page({ style: { colour } }))).toEqual(["colour"]);
        expect(codes(page({ style: { font: "bold" } }))).toEqual(["font"]);
        expect(codes(page({ style: { bg: "photo" } }))).toEqual(["background"]);
        const plain = { mode: "plain" as const, brand: "#112233" };
        expect(codes(page({ style: { colour: plain, bg: "gradient", shape: "round" } }))).toEqual(
            [],
        );
    });

    it("counts a paid section, unless it's hidden, still sample words or already live", () => {
        const block = shop();
        expect(codes(page({ blocks: [block] }))).toEqual(["section"]);
        expect(codes(page({ blocks: [{ ...block, hidden: true }] }))).toEqual([]);
        expect(codes(page({ blocks: sectionsFor("shop") }))).toEqual([]);
        expect(codes(page({ blocks: [block] }), page({ blocks: [block] }))).toEqual([]);
    });

    it("counts a new schedule, and not one that's already live", () => {
        const block = text();
        const timed = { ...block, showFrom: "2030-01-01T00:00:00.000Z" };
        expect(codes(page({ blocks: [timed] }))).toEqual(["schedule"]);
        expect(codes(page({ blocks: [timed] }), page({ blocks: [timed] }))).toEqual([]);
        expect(codes(page({ blocks: [timed] }), page({ blocks: [block] }))).toEqual(["schedule"]);
    });

    it("counts tabs and what's inside them", () => {
        const tabs: Block = {
            id: id(),
            type: "tabs",
            variant: "pills",
            tabs: [
                {
                    id: "1",
                    label: "One",
                    blocks: [{ id: id(), type: "text", variant: "plain", text: "Mine" }],
                },
                {
                    id: "2",
                    label: "Two",
                    blocks: [{ id: id(), type: "text", variant: "plain", text: "Too" }],
                },
            ],
        };
        expect(codes(page({ blocks: [tabs] }))).toEqual(["section"]);
    });

    it("allows 6 sections, or as many as are already live", () => {
        const six = Array.from({ length: 6 }, () => text());
        expect(codes(page({ blocks: six }))).toEqual([]);
        const seven = [...six, text()];
        expect(codes(page({ blocks: seven }))).toEqual(["too_many"]);
        expect(codes(page({ blocks: seven }), page({ blocks: seven }))).toEqual([]);
        expect(codes(page({ blocks: [...seven, text()] }), page({ blocks: seven }))).toEqual([
            "too_many",
        ]);
    });
});
