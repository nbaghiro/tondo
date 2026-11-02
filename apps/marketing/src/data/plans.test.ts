import { PLANS, PRICES } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { cards, groups, heads, MORE_LINE } from "./plans";

const row = (label: string) => {
    const found = groups.flatMap((group) => group.rows).find((other) => other.label === label);
    if (!found) throw new Error(`No row called ${label}`);
    return found.cells.map((cell) => (typeof cell === "object" ? cell.value : cell));
};

describe("the pricing table", () => {
    it("shows the numbers the plans enforce", () => {
        expect(row("Live pages")).toEqual([String(PLANS.starter.live), String(PLANS.pro.live)]);
        expect(row("Help me credits a month")).toEqual(
            [PLANS.starter, PLANS.pro].map((plan) => String(plan.credits)),
        );
        expect(row("Uploaded photos")).toEqual(
            [PLANS.starter, PLANS.pro].map((plan) => plan.photos.toLocaleString("en")),
        );
    });

    it("shows the prices", () => {
        for (const [at, plan] of [
            [0, "starter"],
            [1, "pro"],
        ] as const) {
            expect(heads[at]?.price).toContain(`$${String(PRICES[plan].month)} a month`);
            expect(heads[at]?.price).toContain(`$${String(PRICES[plan].year)} a year`);
            expect(cards[at]?.month).toBe(`$${String(PRICES[plan].month)} a month`);
            expect(cards[at]?.year).toBe(`$${String(PRICES[plan].year)} a year`);
        }
    });

    it("keeps design and sections on both plans, and domains on Pro", () => {
        for (const label of [
            "Every look, colour, font and background",
            "Every kind of section, with no limit on how many",
            "Scheduling a section",
        ]) {
            expect(row(label)).toEqual(["yes", "yes"]);
        }
        expect(row("Your own domain")).toEqual(["no", "yes"]);
    });

    it("doesn't sell by the pack, or list what isn't offered", () => {
        const text = JSON.stringify({ heads, groups, cards, MORE_LINE }).toLowerCase();
        for (const word of ["pack", "coming", "planned", "qr code", "free plan"]) {
            expect(text).not.toContain(word);
        }
    });
});
