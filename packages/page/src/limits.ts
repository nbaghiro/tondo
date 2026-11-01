// The only file that knows what each plan allows. The server decides with these answers, and the
// editor and pricing page show the same numbers.
export type Plan = "free" | "pro" | "team";

export const GRACE_DAYS = 30;
export const PRICES = { pro: { month: 6, year: 60 }, team: { month: 4 } } as const;
export const TEAM_MINIMUM = 3;

export interface Limits {
    /** Pages one account can have. */
    pages: number;
    /** Null means no limit beyond the schema's. */
    sections: number | null;
    photos: number;
    /** Help me credits each month. */
    credits: number;
    statsDays: number;
    /** All looks, own colour, font pairings and a photo background. */
    design: boolean;
    /** Shop, Services, Bookings, Team, Tabs and scheduling. */
    business: boolean;
    mark: boolean;
}

const PAID: Limits = {
    pages: 10,
    sections: null,
    photos: 2000,
    credits: 100,
    statsDays: 90,
    design: true,
    business: true,
    mark: false,
};

export const PLANS: Readonly<Record<Plan, Limits>> = {
    free: {
        pages: 1,
        sections: 6,
        photos: 25,
        credits: 15,
        statsDays: 7,
        design: false,
        business: false,
        mark: true,
    },
    pro: PAID,
    team: PAID,
};

export const FREE_LOOKS = [
    "madder",
    "sap",
    "sumi",
    "lagoon",
    "lilac",
    "office",
    "indigo",
    "dusk",
    "fern",
    "volt",
    "signal",
    "tide",
] as const;

export const PAID_BLOCKS = ["products", "services", "booking", "team", "tabs"] as const;

export const isFreeLook = (look: string): boolean =>
    (FREE_LOOKS as readonly string[]).includes(look);

const isPlan = (value: string): value is Plan => Object.hasOwn(PLANS, value);

export interface Account {
    plan: string;
    endsAt: Date | null;
}
export type AccountLimits = Limits & { designUntil: Date | null };

/** What an account can do at this moment. A plan that ended keeps its design for GRACE_DAYS. */
export function limitsFor({ plan, endsAt }: Account, now: Date): AccountLimits {
    const known = isPlan(plan) ? plan : "free";
    if (endsAt === null || now < endsAt) return { ...PLANS[known], designUntil: null };
    const until = new Date(endsAt.getTime() + GRACE_DAYS * 86_400_000);
    const kept = known !== "free" && now < until;
    return { ...PLANS.free, design: kept, designUntil: kept ? until : null };
}
