import { PLANS, PRICES } from "@tondo/page";

export type Cell = "yes" | "no" | { value: string };

export interface PlanRow {
    label: string;
    note?: string;
    /** Free, Starter, Pro. */
    cells: [Cell, Cell, Cell];
}

const SAME: [Cell, Cell, Cell] = ["yes", "yes", "yes"];
const ONLINE: [Cell, Cell, Cell] = ["no", "yes", "yes"];
const PRO_ONLY: [Cell, Cell, Cell] = ["no", "no", "yes"];

const priced = (plan: keyof typeof PRICES) =>
    `$${String(PRICES[plan].month)} a month or $${String(PRICES[plan].year)} a year`;
const numbers = (
    read: (plan: (typeof PLANS)[keyof typeof PLANS]) => number,
): [Cell, Cell, Cell] => [
    { value: read(PLANS.free).toLocaleString("en") },
    { value: read(PLANS.starter).toLocaleString("en") },
    { value: read(PLANS.pro).toLocaleString("en") },
];

export const heads = [
    { name: "Free", price: "$0" },
    { name: "Starter", price: priced("starter") },
    { name: "Pro", price: priced("pro") },
];

/** The cards at the top of the pricing page and on Home. */
export const cards = [
    {
        name: "Free",
        price: "$0",
        period: "No card needed",
        features: [
            "Build and preview one page",
            "Your address, held while you build",
            "Every look and section",
            `${String(PLANS.free.credits)} Help me credits a month`,
            `${String(PLANS.free.photos)} photos`,
        ],
        note: "Your page goes online when you choose a plan.",
        cta: "Start building",
        recommended: false,
    },
    {
        name: "Starter",
        price: `$${String(PRICES.starter.month)} a month`,
        period: `or $${String(PRICES.starter.year)} a year`,
        features: [
            `${String(PLANS.starter.live)} live page`,
            "Every look and section",
            "Views and link clicks",
            `${String(PLANS.starter.credits)} Help me credits a month`,
            `${PLANS.starter.photos.toLocaleString("en")} photos`,
        ],
        note: "",
        cta: "Choose Starter",
        recommended: true,
    },
    {
        name: "Pro",
        price: `$${String(PRICES.pro.month)} a month`,
        period: `or $${String(PRICES.pro.year)} a year`,
        features: [
            `${String(PLANS.pro.live)} live pages`,
            "Team features, at one price for the account",
            "Views and link clicks",
            `${String(PLANS.pro.credits)} Help me credits a month`,
            `${PLANS.pro.photos.toLocaleString("en")} photos`,
        ],
        note: "",
        cta: "Choose Pro",
        recommended: false,
    },
];

export const groups: { name: string; rows: PlanRow[] }[] = [
    {
        name: "Your page",
        rows: [
            { label: "An address at tondo.page", cells: SAME },
            { label: "Building a page and previewing it", cells: SAME },
            {
                label: "Live pages",
                note: "Paying is what puts a page online. Free is for building and previewing.",
                cells: [
                    { value: "None" },
                    { value: String(PLANS.starter.live) },
                    { value: String(PLANS.pro.live) },
                ],
            },
            { label: "Every kind of section, with no limit on how many", cells: SAME },
            { label: "Scheduling a section", cells: SAME },
        ],
    },
    {
        name: "Design",
        rows: [
            { label: "Every look, colour, font and background", cells: SAME },
            { label: "No Tondo branding on your page", cells: SAME },
        ],
    },
    {
        name: "Help me and photos",
        rows: [
            { label: "Help me credits a month", cells: numbers((plan) => plan.credits) },
            { label: "Uploaded photos", cells: numbers((plan) => plan.photos) },
        ],
    },
    {
        name: "Address and sharing",
        rows: [{ label: "Page title and description for search and chats", cells: SAME }],
    },
    {
        name: "Statistics",
        rows: [
            {
                label: "Page views and link clicks",
                note: "Counted once a page is live, so Free has nothing to count.",
                cells: ONLINE,
            },
            { label: "7, 30 and 90 days", cells: ONLINE },
        ],
    },
    {
        name: "Teams",
        rows: [
            { label: "A Team section that lists people", cells: SAME },
            { label: "A page for each person, on one account", cells: PRO_ONLY },
            { label: "Shared looks", cells: PRO_ONLY },
            { label: "Roles and permissions", cells: PRO_ONLY },
            { label: "Invitation links", cells: PRO_ONLY },
            { label: "Duplicate a page", cells: PRO_ONLY },
        ],
    },
];
