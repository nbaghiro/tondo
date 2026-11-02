import { describe, expect, it } from "vitest";
import {
    canAddPage,
    canPublishPage,
    canPublishStanding,
    isOnline,
    isPageOnline,
    limitsFor,
    PLANS,
    PRICES,
    MOST_PACKS,
    PACK_PAGES,
} from "./limits";
import type { Account, Standing } from "./limits";

const NOW = new Date("2026-11-01T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe("the plans", () => {
    it("has the decided numbers", () => {
        expect(PLANS.free).toEqual({
            pages: 1,
            live: 0,
            photos: 25,
            credits: 15,
            creditsOnce: true,
            team: false,
        });
        expect(PLANS.starter).toMatchObject({ live: 1, photos: 2000, credits: 100 });
        expect(PLANS.pro).toMatchObject({ live: 5, photos: 2000, credits: 300, team: true });
        expect(PLANS.starter).toMatchObject({ pages: 1, team: false });
        expect(limitsFor({ plan: "pro", endsAt: null, packs: 3 }, NOW)).toMatchObject({
            pages: 15,
            live: 15,
            credits: 900,
            photos: 2000,
        });
        expect(MOST_PACKS * PACK_PAGES).toBe(100);
        expect(PRICES).toEqual({
            starter: { month: 5, year: 48 },
            pro: { month: 12, year: 120 },
        });
    });
});

describe("what a plan allows at a moment", () => {
    it("reads each state", () => {
        expect(limitsFor({ plan: "free", endsAt: null }, NOW)).toBe(PLANS.free);
        expect(limitsFor({ plan: "starter", endsAt: null }, NOW)).toBe(PLANS.starter);
        expect(limitsFor({ plan: "pro", endsAt: ago(-30) }, NOW)).toEqual(PLANS.pro);
    });

    it("drops to Free at the exact moment a plan ends, with no step in between", () => {
        expect(limitsFor({ plan: "pro", endsAt: new Date(NOW.getTime() + 1) }, NOW)).toEqual(
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
        expect(canAddPage(PLANS.starter, 1)).toBe(false);
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

describe("which pages stay online on a team", () => {
    const limitsOf = (account: Account) => limitsFor(account, NOW);
    const paying: Account = { plan: "pro", endsAt: null };
    const ended: Account = { plan: "pro", endsAt: ago(1) };
    const free: Account = { plan: "free", endsAt: null };
    const starter: Account = { plan: "starter", endsAt: null };
    const standing = (over: Partial<Standing>): Standing => ({
        kind: "personal",
        account: free,
        team: null,
        rank: 0,
        joinedOlder: false,
        personalLive: 0,
        joinedLive: false,
        published: true,
        teamRank: 0,
        teamLive: 1,
        ...over,
    });
    const online = (over: Partial<Standing>) => isPageOnline(standing(over), limitsOf);

    it("keeps a team's own pages online only while the owner's plan covers it", () => {
        expect(online({ kind: "team", account: paying, team: paying })).toBe(true);
        expect(online({ kind: "team", account: ended, team: ended })).toBe(false);
        expect(online({ kind: "team", account: starter, team: starter })).toBe(false);
    });

    it("covers a joined page whatever the person's own plan is", () => {
        expect(online({ kind: "joined", account: free, team: paying })).toBe(true);
        expect(online({ kind: "joined", account: starter, team: paying, rank: 3 })).toBe(true);
    });

    it("doesn't count a covered joined page against the person's other pages", () => {
        const other = { account: starter, team: paying, joinedOlder: true, joinedLive: true };
        expect(online(other)).toBe(true);
    });

    it("sends a joined page offline with the plan, for a member on Free", () => {
        expect(online({ kind: "joined", account: free, team: ended })).toBe(false);
    });

    it("counts a joined page oldest first once the plan ends, for a member on Starter", () => {
        expect(online({ kind: "joined", account: starter, team: ended })).toBe(true);
        expect(online({ account: starter, team: ended, joinedOlder: true })).toBe(false);
        expect(online({ kind: "joined", account: starter, team: ended, rank: 1 })).toBe(false);
        expect(online({ account: starter, team: ended })).toBe(true);
    });

    it("keeps a member's pages online on their own Pro after the plan ends", () => {
        expect(online({ kind: "joined", account: paying, team: ended, rank: 2 })).toBe(true);
        expect(online({ account: paying, team: ended, joinedOlder: true })).toBe(true);
    });

    it("has a page with no team follow its person's plan, as it always has", () => {
        expect(online({ account: starter })).toBe(true);
        expect(online({ account: starter, rank: 1 })).toBe(false);
        expect(online({ account: free })).toBe(false);
    });

    it("holds a team to the owner's live pages, oldest first", () => {
        const two: Account = { plan: "pro", endsAt: null, packs: 2 };
        expect(online({ kind: "team", account: two, team: two, teamRank: 9 })).toBe(true);
        expect(online({ kind: "team", account: two, team: two, teamRank: 10 })).toBe(false);
        expect(online({ kind: "joined", account: free, team: paying, teamRank: 5 })).toBe(false);
        expect(online({ kind: "joined", account: paying, team: paying, teamRank: 5 })).toBe(true);
    });

    it("decides publishing by the same rule", () => {
        const publishing = (over: Partial<Standing>) =>
            canPublishStanding(standing({ published: false, ...over }), limitsOf);
        expect(publishing({ kind: "team", account: free, team: free })).toBe(false);
        expect(publishing({ kind: "team", account: paying, team: paying })).toBe(true);
        expect(publishing({ kind: "team", account: paying, team: paying, teamLive: 5 })).toBe(
            false,
        );
        expect(publishing({ kind: "joined", account: free, team: paying })).toBe(true);
        expect(publishing({ kind: "joined", account: free, team: ended })).toBe(false);
        expect(publishing({ account: starter, team: paying, joinedLive: true })).toBe(true);
        expect(publishing({ account: starter, team: ended, joinedLive: true })).toBe(false);
        expect(publishing({ account: starter, personalLive: 1 })).toBe(false);
    });
});
