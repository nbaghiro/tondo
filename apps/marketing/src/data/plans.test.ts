import { FREE_LOOKS, lookNames, PLANS, PRICES, TEAM_MINIMUM } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { groups, heads } from "./plans";

const row = (label: string) => {
    const found = groups.flatMap((group) => group.rows).find((other) => other.label === label);
    if (!found) throw new Error(`No row called ${label}`);
    return found.cells.map((cell) => (typeof cell === "object" ? cell.value : cell));
};

describe("the pricing table", () => {
    it("shows the numbers the plans enforce", () => {
        expect(row("Sections on a page")).toEqual([
            String(PLANS.free.sections),
            "No limit",
            "No limit",
        ]);
        expect(row("Looks")).toEqual([
            String(FREE_LOOKS.length),
            `All ${String(lookNames.length)}`,
            `All ${String(lookNames.length)}`,
        ]);
        expect(row("Uploaded photos")[0]).toBe(String(PLANS.free.photos));
        expect(row("Uploaded photos")[1]).toBe(PLANS.pro.photos.toLocaleString("en"));
        expect(row("Days you can look back")).toEqual(
            [PLANS.free, PLANS.pro, PLANS.team].map((plan) => String(plan.statsDays)),
        );
    });

    it("shows the prices", () => {
        expect(heads[1]?.price).toContain(`$${String(PRICES.pro.month)} a month`);
        expect(heads[1]?.price).toContain(`$${String(PRICES.pro.year)} a year`);
        expect(heads[2]?.price).toContain(`from ${String(TEAM_MINIMUM)} people`);
    });

    it("doesn't offer paid sections or design under Free", () => {
        for (const label of [
            "Products and services that link to your own shop",
            "A Bookings section",
            "Tabs",
            "Scheduling a section",
            "A Team section that lists people",
            "Your own colour, or one from your photo",
            "8 font pairings",
            "A photo as your background",
        ]) {
            expect(row(label)[0]).toBe("no");
        }
    });
});
