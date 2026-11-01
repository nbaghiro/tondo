import { PLANS } from "@tondo/page";
import type { PaidUse } from "@tondo/page";

const TRY = "Try it as long as you like, and you'll be asked when you publish.";
const BUILD = "You can build it now and decide when you publish.";
const LINK_INSTEAD = new Set(["Shop", "Bookings"]);

/** The one line someone sees the first time they try something that needs Pro. */
export function noteFor(use: PaidUse): string {
    switch (use.code) {
        case "look":
            return `${use.label} is part of Pro. ${TRY}`;
        case "colour":
            return `Your own colour is part of Pro. ${TRY}`;
        case "font":
            return `Your own fonts are part of Pro. ${TRY}`;
        case "background":
            return `A photo background is part of Pro. ${TRY}`;
        case "section":
            return `${use.label} is part of Pro. ${BUILD}${
                LINK_INSTEAD.has(use.label) ? " A plain button can link there for free." : ""
            }`;
        case "schedule":
            return "Scheduling is part of Pro. It works here, and you'll be asked when you publish.";
        case "too_many":
            return `Free pages go live with up to ${String(PLANS.free.sections)} sections.`;
    }
}

const joined = (labels: readonly string[]): string =>
    labels.length < 2
        ? (labels[0] ?? "")
        : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1) ?? ""}`;

/** "Your page uses Bakehouse, your own colour and Shop, which are part of Pro." */
export const usesLine = (uses: readonly PaidUse[]): string =>
    `Your page uses ${joined(uses.map((use) => use.label))}, which ${
        uses.length === 1 ? "is" : "are"
    } part of Pro.`;

/** What publishing with free choices would change, one line each. */
export function changesFrom(uses: readonly PaidUse[], freeLook: string): string[] {
    return uses.map((use) => {
        switch (use.code) {
            case "look":
                return `${use.label} becomes ${freeLook}.`;
            case "colour":
                return "Your own colour goes back to the look's.";
            case "font":
                return "Your own fonts go back to the look's.";
            case "background":
                return "The photo background goes back to the look's.";
            case "section":
                return `${use.label} stays off the live page.`;
            case "schedule":
                return "Sections with a new schedule stay off the live page.";
            case "too_many":
                return `Only the first ${String(PLANS.free.sections)} sections go live.`;
        }
    });
}

export const longDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" });
