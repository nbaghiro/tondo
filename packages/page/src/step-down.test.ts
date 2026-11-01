import { describe, expect, it } from "vitest";
import type { Block } from "./blocks";
import { FREE_LOOKS, PLANS } from "./limits";
import { paidUses } from "./paid-uses";
import { everyLayoutPage, starterPage } from "./samples";
import { lookNames, pageSchema } from "./schema";
import type { Page } from "./schema";
import { FREE_LOOK_FOR, stepDown } from "./step-down";

const text = (id: string): Block => ({
    id,
    type: "text",
    variant: "plain",
    section: id,
    text: "Mine",
});
const shop = (id: string): Block => ({
    id,
    type: "products",
    variant: "grid",
    section: id,
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
const rich = (): Page => ({
    ...starterPage("June"),
    look: "bake",
    seed: 4,
    style: {
        colour: { mode: "brand", brand: "#112233" },
        font: "bold",
        bg: "photo",
        bgPhoto: { file: "a.jpg" },
        shape: "round",
    },
    blocks: [text("a"), shop("b"), { ...text("c"), showUntil: "2030-01-01T00:00:00.000Z" }],
});

describe("stepDown", () => {
    it("maps every paid look to a free one", () => {
        for (const look of lookNames) {
            const down = stepDown({ ...starterPage("June"), look }, { keepContent: true });
            expect(FREE_LOOKS).toContain(down.look);
        }
        expect(Object.keys(FREE_LOOK_FOR)).toHaveLength(38);
    });

    it("takes paid design off, keeps the rest and leaves the page given alone", () => {
        const page = rich();
        const before = JSON.stringify(page);
        const down = stepDown(page, { keepContent: true });
        expect(JSON.stringify(page)).toBe(before);
        expect(down.look).toBe("sap");
        expect(down.seed).toBeUndefined();
        expect(down.style).toEqual({ shape: "round" });
        expect(down.blocks).toHaveLength(3);
    });

    it("keeps a free look's own painting and plain colours", () => {
        const page: Page = {
            ...starterPage("June"),
            look: "madder",
            seed: 4,
            style: { colour: { mode: "dark", brand: "#112233" } },
        };
        expect(stepDown(page, { keepContent: true })).toEqual(page);
    });

    it("leaves nothing to pay for when content steps down too", () => {
        const down = stepDown(rich(), { keepContent: false, live: null });
        expect(down.blocks.map((block) => block.id)).toEqual(["a"]);
        expect(paidUses(down, PLANS.free, null, (look) => look)).toEqual([]);
    });

    it("keeps what's already live, and drops only the newest past the limit", () => {
        const eight = Array.from({ length: 8 }, (_, i) => text(`s${String(i)}`));
        const down = stepDown({ ...starterPage("June"), blocks: eight }, { keepContent: false });
        expect(down.blocks.map((block) => block.id)).toEqual(eight.slice(0, 6).map((b) => b.id));

        const live = { ...starterPage("June"), blocks: [shop("b"), text("a")] };
        const kept = stepDown(
            { ...rich(), blocks: [shop("b"), text("a")] },
            { keepContent: false, live },
        );
        expect(kept.blocks.map((block) => block.id)).toEqual(["b", "a"]);
    });

    it("can keep a design the plan still allows", () => {
        const down = stepDown(rich(), { keepContent: false, live: null, keepDesign: true });
        expect(down.look).toBe("bake");
        expect(down.blocks.map((block) => block.id)).toEqual(["a"]);
    });

    it("still gives a valid page for every layout and look", () => {
        for (const look of ["bake", "madder"] as const) {
            const down = stepDown(everyLayoutPage(look), { keepContent: false, live: null });
            expect(pageSchema.safeParse(down).success).toBe(true);
            expect(paidUses(down, PLANS.free, null, (name) => name)).toEqual([]);
        }
    });
});
