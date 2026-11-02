import { PLANS, PRICES } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { groups, heads } from "./plans";

const row = (label: string) => {
    const found = groups.flatMap((group) => group.rows).find((other) => other.label === label);
    if (!found) throw new Error(`No row called ${label}`);
    return found.cells.map((cell) => (typeof cell === "object" ? cell.value : cell));
};

describe("the pricing table", () => {
    it("shows the numbers the plans enforce", () => {
        expect(row("Live pages")).toEqual([
            "None",
            String(PLANS.starter.live),
            String(PLANS.pro.live),
        ]);
        expect(row("Help me credits a month")).toEqual(
            [PLANS.free, PLANS.starter, PLANS.pro].map((plan) => String(plan.credits)),
        );
        expect(row("Uploaded photos")).toEqual(
            [PLANS.free, PLANS.starter, PLANS.pro].map((plan) => plan.photos.toLocaleString("en")),
        );
    });

    it("shows the prices", () => {
        for (const [at, plan] of [
            [1, "starter"],
            [2, "pro"],
        ] as const) {
            expect(heads[at]?.price).toContain(`$${String(PRICES[plan].month)} a month`);
            expect(heads[at]?.price).toContain(`$${String(PRICES[plan].year)} a year`);
        }
    });

    it("keeps design and sections on every plan", () => {
        for (const label of [
            "Every look, colour, font and background",
            "Every kind of section, with no limit on how many",
            "Scheduling a section",
        ]) {
            expect(row(label)).toEqual(["yes", "yes", "yes"]);
        }
    });

    it("states everything as it will be at launch", () => {
        const text = JSON.stringify({ heads, groups });
        for (const word of ["Coming", "Planned", "Available today"]) {
            expect(text).not.toContain(word);
        }
    });
});
