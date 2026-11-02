import { PLANS } from "@tondo/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import { limitsOf, livePageIssue } from "./limits";

const free = { plan: "free", endsAt: null };

describe("plans being switched on", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("treats everyone as paid while off, without raising Help me's credits", () => {
        expect(limitsOf(free)).toEqual({ ...PLANS.pro, credits: PLANS.free.credits });
    });

    it("keeps the local credit override", () => {
        vi.stubEnv("TONDO_PLAN", "pro");
        expect(limitsOf(free).credits).toBe(PLANS.pro.credits);
    });

    it("uses the account's plan once on", () => {
        vi.stubEnv("PLANS_ON", "true");
        expect(limitsOf(free)).toBe(PLANS.free);
        expect(limitsOf({ plan: "starter", endsAt: null })).toBe(PLANS.starter);
        expect(limitsOf({ plan: "pro", endsAt: new Date(0) })).toBe(PLANS.free);
    });
});

describe("a page the plan doesn't cover", () => {
    it("offers what would solve it", () => {
        expect(livePageIssue(PLANS.free).plan).toBe("any");
        expect(livePageIssue(PLANS.starter).plan).toBe("pro");
        expect(livePageIssue(PLANS.pro).plan).toBeUndefined();
    });
});
