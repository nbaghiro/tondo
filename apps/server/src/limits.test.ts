import { afterEach, describe, expect, it, vi } from "vitest";
import { limitsOf } from "./limits";

const free = { plan: "free", endsAt: null };

describe("plans being switched on", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("treats everyone as Pro while off, without raising Help me's credits", () => {
        expect(limitsOf(free)).toMatchObject({ mark: false, design: true, credits: 15 });
    });

    it("keeps the local credit override", () => {
        vi.stubEnv("TONDO_PLAN", "pro");
        expect(limitsOf(free).credits).toBe(100);
    });

    it("uses the account's plan once on", () => {
        vi.stubEnv("PLANS_ON", "true");
        expect(limitsOf(free)).toMatchObject({ mark: true, design: false, photos: 25 });
        expect(limitsOf({ plan: "pro", endsAt: null }).mark).toBe(false);
    });
});
