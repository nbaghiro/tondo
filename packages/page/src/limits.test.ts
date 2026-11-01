import { describe, expect, it } from "vitest";
import { FREE_LOOKS, GRACE_DAYS, limitsFor, PAID_BLOCKS, PLANS } from "./limits";
import { lookNames } from "./schema";
import { sectionAvailable, sectionDefinitions } from "./sections";

const NOW = new Date("2026-11-01T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe("what a plan allows at a moment", () => {
    it("reads each state", () => {
        expect(limitsFor({ plan: "free", endsAt: null }, NOW).mark).toBe(true);
        expect(limitsFor({ plan: "pro", endsAt: null }, NOW).design).toBe(true);
        expect(limitsFor({ plan: "pro", endsAt: ago(-30) }, NOW).mark).toBe(false);
    });

    it("keeps the design and nothing else for 30 days after a plan ends", () => {
        const ended = limitsFor({ plan: "pro", endsAt: ago(10) }, NOW);
        expect(ended).toMatchObject({ design: true, mark: true, business: false, photos: 25 });
        expect(ended.designUntil).toEqual(new Date(ago(10).getTime() + GRACE_DAYS * DAY));
    });

    it("changes at the exact moments", () => {
        expect(limitsFor({ plan: "pro", endsAt: NOW }, NOW).mark).toBe(true);
        const atEnd = ago(GRACE_DAYS);
        expect(limitsFor({ plan: "pro", endsAt: atEnd }, NOW).design).toBe(false);
        expect(limitsFor({ plan: "pro", endsAt: atEnd }, NOW).designUntil).toBeNull();
        const justInside = new Date(atEnd.getTime() + 1);
        expect(limitsFor({ plan: "pro", endsAt: justInside }, NOW).design).toBe(true);
    });

    it("treats a plan it doesn't know as Free", () => {
        expect(limitsFor({ plan: "gold", endsAt: null }, NOW)).toMatchObject(PLANS.free);
    });
});

describe("the split", () => {
    it("has 12 free looks of the 50", () => {
        expect(FREE_LOOKS).toHaveLength(12);
        expect(lookNames).toHaveLength(50);
        for (const look of FREE_LOOKS) expect(lookNames).toContain(look);
    });

    it("assigns every section someone can use", () => {
        const available = sectionDefinitions.filter(sectionAvailable);
        const paid = (types: readonly string[]) =>
            available.filter((section) =>
                section.styles.some((style) => types.includes(style.type)),
            );
        expect(paid(PAID_BLOCKS).map((section) => section.key)).toEqual([
            "shop",
            "services",
            "bookings",
            "team",
            "tabs",
        ]);
        // With Title, which is drawn from a separate definition, that's the 14 free kinds.
        expect(available.length - paid(PAID_BLOCKS).length + 1).toBe(14);
    });
});
