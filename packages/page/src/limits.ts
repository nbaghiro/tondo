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
}

export const PLANS: Readonly<Record<Plan, Limits>> = {
    free: { pages: 1, live: 0, photos: 25, credits: 15 },
    starter: { pages: 5, live: 1, photos: 2000, credits: 100 },
    pro: { pages: 5, live: 5, photos: 2000, credits: 300 },
};

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
