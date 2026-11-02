// The only file that knows what each plan allows. The server decides with these answers, and the
// editor and pricing page show the same numbers.
export type Plan = "free" | "starter" | "pro";
export type PaidPlan = Exclude<Plan, "free">;
export type Period = "month" | "year";

export const PRICES: Readonly<Record<PaidPlan, Readonly<Record<Period, number>>>> = {
    starter: { month: 5, year: 48 },
    /** For 5 pages. Each further 5 costs the same again. */
    pro: { month: 12, year: 120 },
};

export interface Limits {
    /** Pages one account can build. */
    pages: number;
    /** Of those, how many visitors can see. */
    live: number;
    photos: number;
    /** Help me credits each month, or in total with `creditsOnce`. */
    credits: number;
    /** These credits don't come back each month. */
    creditsOnce: boolean;
    /** Whether this plan covers a team. */
    team: boolean;
    /** Whether a page can show at the person's own domain. */
    domain: boolean;
}

// `free` isn't sold as a plan. It's what an account has before it subscribes, or after it stops.
export const PLANS: Readonly<Record<Plan, Limits>> = {
    free: {
        pages: 1,
        live: 0,
        photos: 25,
        credits: 15,
        creditsOnce: true,
        team: false,
        domain: false,
    },
    starter: {
        pages: 1,
        live: 1,
        photos: 2000,
        credits: 100,
        creditsOnce: false,
        team: false,
        domain: false,
    },
    pro: {
        pages: 5,
        live: 5,
        photos: 2000,
        credits: 300,
        creditsOnce: false,
        team: true,
        domain: true,
    },
};

/** Pro is sold in packs of this many pages. */
export const PACK_PAGES = PLANS.pro.live;
/** The most packs one account can have, which is 100 pages. */
export const MOST_PACKS = 20;
/** How long the first subscription is free for. Once per account. */
export const TRIAL_DAYS = 14;
/** How long an invitation link works. */
export const INVITE_DAYS = 7;

/** Whether someone with this many pages can add another. */
export const canAddPage = (limits: Pick<Limits, "pages">, total: number): boolean =>
    total < limits.pages;

/**
 * A person's live pages count oldest first, and visitors see those within the plan's number. `rank` is
 * how many older live pages this one has. The rest stay stored, offline, until the number allows them.
 */
export const isOnline = (limits: Pick<Limits, "live">, rank: number): boolean => rank < limits.live;

/** Whether this page can be published, given the person's live pages. Null means it isn't one. */
export const canPublishPage = (
    limits: Pick<Limits, "live">,
    live: number,
    rank: number | null,
): boolean => (rank === null ? live < limits.live : isOnline(limits, rank));

const isPlan = (value: string): value is Plan => Object.hasOwn(PLANS, value);

export interface Account {
    plan: string;
    endsAt: Date | null;
    /** How many packs of Pro. Left out means one. */
    packs?: number;
}

/** What one account's Pro comes to, with its pages and credits for this many packs. */
export const proLimits = (packs: number): Limits => ({
    ...PLANS.pro,
    pages: PLANS.pro.pages * packs,
    live: PLANS.pro.live * packs,
    credits: PLANS.pro.credits * packs,
});

/** What an account can do at this moment. Once a plan has ended, it's back to having none. */
export function limitsFor({ plan, endsAt, packs = 1 }: Account, now: Date): Limits {
    if (endsAt !== null && now >= endsAt) return PLANS.free;
    if (plan === "pro") return proLimits(packs);
    return PLANS[isPlan(plan) ? plan : "free"];
}

/** Everything that decides whether visitors can see a page, read from storage. */
export interface Standing {
    kind: "personal" | "joined" | "team";
    /** The person's plan, or the owner's for a team's own page. */
    account: Account;
    /** The plan of the owner of this person's team, or of this page's team. */
    team: Account | null;
    /** Older live pages of this person, leaving out any on a team. */
    rank: number;
    /** This person's page on a team is live, and older than this one. */
    joinedOlder: boolean;
    /** This person's live pages, leaving out any on a team. */
    personalLive: number;
    /** This person's page on a team is live. */
    joinedLive: boolean;
    /** This page is live, whether or not visitors can see it. */
    published: boolean;
    /** Older live pages on this page's team. */
    teamRank: number;
    /** Live pages on this page's team. */
    teamLive: number;
}

export type LimitsOf = (account: Account) => Limits;

/** Whether a team's owner is on a plan that covers it. */
export const isCovered = (team: Account | null, limitsOf: LimitsOf): boolean =>
    team !== null && limitsOf(team).team;

/** How many pages a team can hold. Before the owner pays, there's room to build one pack's worth. */
export const teamRoom = (team: Account, limitsOf: LimitsOf): number =>
    isCovered(team, limitsOf) ? limitsOf(team).live : PACK_PAGES;

/** Whether a page on a covered team fits within the owner's live pages, oldest first. */
const fitsTeam = (standing: Standing, limitsOf: LimitsOf): boolean =>
    standing.team !== null &&
    isCovered(standing.team, limitsOf) &&
    standing.teamRank < limitsOf(standing.team).live;

/**
 * A covered team pays for its own pages and each person's joined page, up to the owner's live pages, and
 * they don't use anyone else's. Past that or without cover, a team's pages are offline and a joined page
 * counts like any other page.
 */
export function isPageOnline(standing: Standing, limitsOf: LimitsOf): boolean {
    if (standing.kind === "team") return fitsTeam(standing, limitsOf);
    if (standing.kind === "joined" && fitsTeam(standing, limitsOf)) return true;
    const covered = isCovered(standing.team, limitsOf);
    const rank = standing.rank + (standing.joinedOlder && !covered ? 1 : 0);
    return isOnline(limitsOf(standing.account), rank);
}

/** Whether this page can be published, by the same rule. */
export function canPublishStanding(standing: Standing, limitsOf: LimitsOf): boolean {
    if (standing.kind !== "personal" && standing.team && isCovered(standing.team, limitsOf)) {
        const room = standing.teamLive < limitsOf(standing.team).live;
        if (standing.published ? fitsTeam(standing, limitsOf) : room) return true;
    }
    if (standing.kind === "team") return false;
    if (standing.published) return isPageOnline(standing, limitsOf);
    const covered = isCovered(standing.team, limitsOf);
    const live = standing.personalLive + (standing.joinedLive && !covered ? 1 : 0);
    return canPublishPage(limitsOf(standing.account), live, null);
}

/** Whether this page can show at its own domain. A covered team's plan pays for its pages. */
export function canUseDomain(standing: Standing, limitsOf: LimitsOf): boolean {
    if (standing.kind !== "personal" && isCovered(standing.team, limitsOf)) return true;
    return standing.kind !== "team" && limitsOf(standing.account).domain;
}
