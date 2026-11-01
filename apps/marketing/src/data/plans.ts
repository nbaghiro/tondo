import { FREE_LOOKS, lookNames, PLANS, PRICES, TEAM_MINIMUM } from "@tondo/page";

// Every "yes" here has to work today, and every "coming" has to be true of production.
export type Cell = "yes" | "coming" | "no" | { value: string; coming?: boolean };

export interface PlanRow {
    label: string;
    note?: string;
    /** Free, Pro, Team. */
    cells: [Cell, Cell, Cell];
}

const SAME: [Cell, Cell, Cell] = ["yes", "yes", "yes"];
const COMING: [Cell, Cell, Cell] = ["coming", "coming", "coming"];
const PAID: [Cell, Cell, Cell] = ["no", "yes", "yes"];
const PAID_LATER: [Cell, Cell, Cell] = ["no", "coming", "coming"];
const TEAM_LATER: [Cell, Cell, Cell] = ["no", "no", "coming"];

export const heads = [
    { name: "Free", price: "$0", note: "Available today" },
    {
        name: "Pro",
        price: `$${String(PRICES.pro.month)} a month or $${String(PRICES.pro.year)} a year`,
        note: "Planned",
    },
    {
        name: "Team",
        price: `$${String(PRICES.team.month)} a person, from ${String(TEAM_MINIMUM)} people`,
        note: "Planned",
    },
];

export const groups: { name: string; rows: PlanRow[] }[] = [
    {
        name: "Your page",
        rows: [
            { label: "An address at tondo.page", cells: SAME },
            { label: "Publishing and a preview before you do", cells: SAME },
            {
                label: "Sections on a page",
                cells: [
                    { value: String(PLANS.free.sections) },
                    { value: "No limit" },
                    { value: "No limit" },
                ],
            },
            {
                label: "Links, photos, video, music, events, questions and more",
                note: "14 kinds of section.",
                cells: SAME,
            },
            { label: "Products and services that link to your own shop", cells: PAID },
            { label: "A Bookings section", cells: PAID },
            { label: "A button that links to your booking page", cells: SAME },
            { label: "Tabs", cells: PAID },
            { label: "Scheduling a section", cells: PAID },
            { label: "Email sign-ups and forms", cells: COMING },
            { label: "File downloads", cells: COMING },
            { label: "Embeds and a calendar on the page", cells: COMING },
            { label: "Feeds from Instagram and other accounts", cells: COMING },
        ],
    },
    {
        name: "Design",
        rows: [
            {
                label: "Looks",
                cells: [
                    { value: String(FREE_LOOKS.length) },
                    { value: `All ${String(lookNames.length)}` },
                    { value: `All ${String(lookNames.length)}` },
                ],
            },
            { label: "Each look's own colours, plain white and dark", cells: SAME },
            { label: "Each look's own fonts", cells: SAME },
            { label: "Button shapes", cells: SAME },
            { label: "Your own colour, or one from your photo", cells: PAID },
            { label: "8 font pairings", cells: PAID },
            { label: "A background painted for your page", cells: SAME },
            { label: "A photo as your background", cells: PAID },
            {
                label: "Uploaded photos",
                cells: [
                    { value: String(PLANS.free.photos) },
                    { value: PLANS.pro.photos.toLocaleString("en") },
                    { value: `${PLANS.team.photos.toLocaleString("en")} a person` },
                ],
            },
            {
                label: "Remove Tondo branding",
                note: "Free pages will carry a small Made with Tondo.",
                cells: PAID_LATER,
            },
            { label: "Your own favicon and footer logo", cells: PAID_LATER },
            { label: "Upload your own fonts", cells: PAID_LATER },
        ],
    },
    {
        name: "Address and sharing",
        rows: [
            { label: "Page title and description for search and chats", cells: SAME },
            { label: "A QR code for your page", cells: COMING },
            { label: "Custom domain", cells: PAID_LATER },
            { label: "Short links and redirects", cells: PAID_LATER },
        ],
    },
    {
        name: "Statistics",
        rows: [
            { label: "Page views and link clicks", cells: SAME },
            {
                label: "Days you can look back",
                cells: [
                    { value: String(PLANS.free.statsDays) },
                    { value: String(PLANS.pro.statsDays) },
                    { value: String(PLANS.team.statsDays) },
                ],
            },
            { label: "All-time and custom date ranges", cells: PAID_LATER },
            { label: "Traffic sources", cells: PAID_LATER },
            { label: "Export to a spreadsheet", cells: PAID_LATER },
        ],
    },
    {
        name: "Selling",
        rows: [
            { label: "Checkout on your page", cells: COMING },
            { label: "Tips", cells: COMING },
        ],
    },
    {
        name: "Teams",
        rows: [
            { label: "A Team section that lists people", cells: PAID },
            { label: "A page for each person, on one account", cells: TEAM_LATER },
            { label: "Shared looks", cells: TEAM_LATER },
            { label: "Roles and permissions", cells: TEAM_LATER },
            { label: "Invitation links", cells: TEAM_LATER },
            { label: "Duplicate a page", cells: TEAM_LATER },
        ],
    },
];
