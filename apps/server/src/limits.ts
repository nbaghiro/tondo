import type { Draft } from "@tondo/db";
import { isCovered, limitsFor, PACK_PAGES, PLANS, PRICES, proLimits } from "@tondo/page";
import type { Account, Limits, PublishIssue } from "@tondo/page";

export const plansOn = (): boolean => process.env["PLANS_ON"] === "true";

// Until checkout works, asking for a payment would be a dead end, so everyone behaves as paid. Help me
// costs money per use, so its credits stay at the unsubscribed number each month, unless set locally.
export function limitsOf(account: Account, now = new Date()): Limits {
    if (plansOn()) return limitsFor(account, now);
    const credits = process.env["TONDO_PLAN"] === "pro" ? PLANS.pro.credits : PLANS.free.credits;
    return { ...proLimits(account.packs ?? 1), credits };
}

/**
 * Whether this person can't change this page's look. On the look page only the owner can. Elsewhere on a
 * team, the look is locked while the team has one showing.
 */
export function isLookLocked({ team, standing }: Pick<Draft, "team" | "standing">): boolean {
    if (!team) return false;
    if (team.isLookPage) return team.role !== "owner";
    return team.look !== null && isCovered(standing.team, limitsOf);
}

export const photoLimitMessage = ({ photos }: { photos: number }): string =>
    photos < PLANS.pro.photos
        ? `You've used your ${String(photos)} photos. Remove one, or choose a plan for ${PLANS.pro.photos.toLocaleString("en")}.`
        : `You've used your ${photos.toLocaleString("en")} photos. Remove one to add another.`;

export type LimitsOfPerson = (userId: string) => Promise<Limits>;

const pagesLine = (count: number) => `${String(count)} live ${count === 1 ? "page" : "pages"}`;

/** Why this page can't be published on this plan, and what would allow it. */
export const livePageIssue = ({ live, team }: Limits): PublishIssue =>
    live === 0
        ? { target: "page", message: "Choose a plan to put this page online.", plan: "any" }
        : !team
          ? {
                target: "page",
                message: `Your plan includes ${pagesLine(live)}. Pro includes ${String(PLANS.pro.live)}.`,
                plan: "pro",
            }
          : {
                target: "page",
                message: `Your plan includes ${pagesLine(live)}. Take one down, or add ${String(PACK_PAGES)} more pages for $${String(PRICES.pro.month)} a month in Account.`,
            };
