// The only file that knows what each plan allows. The server decides with these answers, and the
// editor and pricing page show the same numbers.
export type Plan = "free" | "starter" | "pro";
export type PaidPlan = Exclude<Plan, "free">;
export type Period = "month" | "year";

export const PRICES: Readonly<Record<PaidPlan, Readonly<Record<Period, number>>>> = {
    starter: { month: 4, year: 40 },
    pro: { month: 10, year: 100 },
};

export interface Limits {
    /** Pages one account can build. */
    pages: number;
    /** Of those, how many visitors can see. */
    live: number;
    photos: number;
    /** Help me credits each month. */
    credits: number;
    /** How many people a team can have, counting its owner. None means this plan doesn't cover one. */
    people: number;
}

export const PLANS: Readonly<Record<Plan, Limits>> = {
    free: { pages: 1, live: 0, photos: 25, credits: 15, people: 0 },
    starter: { pages: 5, live: 1, photos: 2000, credits: 100, people: 0 },
    pro: { pages: 5, live: 5, photos: 2000, credits: 300, people: 10 },
};

/** Pages a team can have of its own, including any waiting for their person. */
export const TEAM_PAGES = 5;
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
}

/** What an account can do at this moment. Once a plan has ended, that's what Free allows. */
export function limitsFor({ plan, endsAt }: Account, now: Date): Limits {
    if (endsAt !== null && now >= endsAt) return PLANS.free;
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
}

export type LimitsOf = (account: Account) => Limits;

/** Whether a team's owner is on a plan that covers it. */
export const isCovered = (team: Account | null, limitsOf: LimitsOf): boolean =>
    team !== null && limitsOf(team).people > 0;

/**
 * A covered team pays for its own pages and each person's joined page, which don't use anyone's live
 * pages. Without that cover, a team's pages are offline and a joined page counts like any other page.
 */
export function isPageOnline(standing: Standing, limitsOf: LimitsOf): boolean {
    const covered = isCovered(standing.team, limitsOf);
    if (standing.kind === "team") return covered;
    if (standing.kind === "joined" && covered) return true;
    const rank = standing.rank + (standing.joinedOlder && !covered ? 1 : 0);
    return isOnline(limitsOf(standing.account), rank);
}

/** Whether this page can be published, by the same rule. */
export function canPublishStanding(standing: Standing, limitsOf: LimitsOf): boolean {
    const covered = isCovered(standing.team, limitsOf);
    if (standing.kind === "team") return covered;
    if (standing.kind === "joined" && covered) return true;
    if (standing.published) return isPageOnline(standing, limitsOf);
    const live = standing.personalLive + (standing.joinedLive && !covered ? 1 : 0);
    return canPublishPage(limitsOf(standing.account), live, null);
}
