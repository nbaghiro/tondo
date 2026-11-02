import { describe, expect, it } from "vitest";
import { canAddPage, canPublishPage, isOnline, limitsFor, PLANS, PRICES } from "./limits";

const NOW = new Date("2026-11-01T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe("the plans", () => {
    it("has the decided numbers", () => {
        expect(PLANS.free).toEqual({ pages: 1, live: 0, photos: 25, credits: 15 });
        expect(PLANS.starter).toMatchObject({ live: 1, photos: 2000, credits: 100 });
        expect(PLANS.pro).toMatchObject({ live: 5, photos: 2000, credits: 300 });
        expect(PRICES).toEqual({
            starter: { month: 4, year: 40 },
            pro: { month: 10, year: 100 },
        });
    });
});

describe("what a plan allows at a moment", () => {
    it("reads each state", () => {
        expect(limitsFor({ plan: "free", endsAt: null }, NOW)).toBe(PLANS.free);
        expect(limitsFor({ plan: "starter", endsAt: null }, NOW)).toBe(PLANS.starter);
        expect(limitsFor({ plan: "pro", endsAt: ago(-30) }, NOW)).toBe(PLANS.pro);
    });

    it("drops to Free at the exact moment a plan ends, with no step in between", () => {
        expect(limitsFor({ plan: "pro", endsAt: new Date(NOW.getTime() + 1) }, NOW)).toBe(
            PLANS.pro,
        );
        expect(limitsFor({ plan: "pro", endsAt: NOW }, NOW)).toBe(PLANS.free);
        expect(limitsFor({ plan: "starter", endsAt: ago(1) }, NOW)).toBe(PLANS.free);
    });

    it("treats a plan it doesn't know as Free", () => {
        expect(limitsFor({ plan: "gold", endsAt: null }, NOW)).toBe(PLANS.free);
    });
});

describe("how many pages", () => {
    it("builds and publishes from separate numbers", () => {
        expect(canAddPage(PLANS.free, 0)).toBe(true);
        expect(canAddPage(PLANS.free, 1)).toBe(false);
        expect(canAddPage(PLANS.starter, 1)).toBe(true);
        expect(canPublishPage(PLANS.free, 0, null)).toBe(false);
        expect(canPublishPage(PLANS.starter, 0, null)).toBe(true);
        expect(canPublishPage(PLANS.starter, 1, null)).toBe(false);
        expect(canPublishPage(PLANS.pro, 4, null)).toBe(true);
        expect(canPublishPage(PLANS.pro, 5, null)).toBe(false);
    });

    it("lets a page within the number publish again, and no other", () => {
        expect(canPublishPage(PLANS.starter, 1, 0)).toBe(true);
        expect(canPublishPage(PLANS.starter, 3, 0)).toBe(true);
        expect(canPublishPage(PLANS.starter, 3, 1)).toBe(false);
        expect(canPublishPage(PLANS.free, 1, 0)).toBe(false);
    });

    it("shows the oldest live pages up to the number", () => {
        expect(isOnline(PLANS.free, 0)).toBe(false);
        expect(isOnline(PLANS.starter, 0)).toBe(true);
        expect(isOnline(PLANS.starter, 1)).toBe(false);
        expect(isOnline(PLANS.pro, 4)).toBe(true);
        expect(isOnline(PLANS.pro, 5)).toBe(false);
    });
});
