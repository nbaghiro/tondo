import { PACK_PAGES, PLANS, PRICES } from "@tondo/page";

export type Cell = "yes" | "no" | { value: string };

export interface PlanRow {
    label: string;
    note?: string;
    /** Starter, Pro. */
    cells: [Cell, Cell];
}

const SAME: [Cell, Cell] = ["yes", "yes"];
const PRO_ONLY: [Cell, Cell] = ["no", "yes"];

const priced = (plan: keyof typeof PRICES) =>
    `$${String(PRICES[plan].month)} a month or $${String(PRICES[plan].year)} a year`;
const numbers = (read: (plan: (typeof PLANS)["pro"]) => number): [Cell, Cell] => [
    { value: read(PLANS.starter).toLocaleString("en") },
    { value: read(PLANS.pro).toLocaleString("en") },
];

export const heads = [
    { name: "Starter", price: priced("starter") },
    { name: "Pro", price: priced("pro") },
];

/** The cards at the top of the pricing page and on Home. */
export const cards = [
    {
        name: "Starter",
        recommended: true,
        month: `$${String(PRICES.starter.month)} a month`,
        year: `$${String(PRICES.starter.year)} a year`,
        features: [
            `${String(PLANS.starter.live)} live page`,
            "Every look and section",
            "Views and link clicks",
            "Help me included",
        ],
    },
    {
        name: "Pro",
        recommended: false,
        month: `$${String(PRICES.pro.month)} a month`,
        year: `$${String(PRICES.pro.year)} a year`,
        features: [
            `${String(PLANS.pro.live)} live pages`,
            "Your own domain",
            "Everything in Starter",
            "More Help me",
        ],
    },
];

export const MORE_LINE = `Need more pages, or running a team? Add ${String(PACK_PAGES)} more pages for $${String(PRICES.pro.month)}, and invite people to edit them.`;

export const groups: { name: string; rows: PlanRow[] }[] = [
    {
        name: "Your page",
        rows: [
            { label: "An address at tondo.page", cells: SAME },
            { label: "Your own domain", cells: PRO_ONLY },
            {
                label: "Live pages",
                note: `On Pro, you can add ${String(PACK_PAGES)} more for $${String(PRICES.pro.month)} a month, up to 100.`,
                cells: numbers((plan) => plan.live),
            },
            { label: "Every kind of section, with no limit on how many", cells: SAME },
            { label: "Scheduling a section", cells: SAME },
        ],
    },
    {
        name: "Design",
        rows: [
            { label: "Every look, colour, font and background", cells: SAME },
            { label: 'Hiding the "Made with Tondo" badge', cells: SAME },
        ],
    },
    {
        name: "Help me and photos",
        rows: [
            {
                label: "Help me credits a month",
                note: `On Pro, ${String(PLANS.pro.credits)} more with each added ${String(PACK_PAGES)} pages.`,
                cells: numbers((plan) => plan.credits),
            },
            { label: "Uploaded photos", cells: numbers((plan) => plan.photos) },
        ],
    },
    {
        name: "Statistics",
        rows: [
            { label: "Page views and link clicks", cells: SAME },
            { label: "7, 30 and 90 days", cells: SAME },
        ],
    },
    {
        name: "Teams",
        rows: [
            { label: "A Team section that lists people", cells: SAME },
            { label: "A page for each person, in one look", cells: PRO_ONLY },
            { label: "Owner, editor and member roles", cells: PRO_ONLY },
            { label: "Invitation links", cells: PRO_ONLY },
            { label: "Duplicating a page", cells: PRO_ONLY },
        ],
    },
];
