import { limitsFor, PLANS } from "@tondo/page";
import type { Account, Limits, PublishIssue } from "@tondo/page";

export const plansOn = (): boolean => process.env["PLANS_ON"] === "true";

// Until checkout works, asking for a payment would be a dead end, so everyone behaves as paid. Help me
// costs money per use, so its credits stay at Free's number, unless set locally to try other limits.
export function limitsOf(account: Account, now = new Date()): Limits {
    if (plansOn()) return limitsFor(account, now);
    const credits = process.env["TONDO_PLAN"] === "pro" ? PLANS.pro.credits : PLANS.free.credits;
    return { ...PLANS.pro, credits };
}

export const photoLimitMessage = ({ photos }: { photos: number }): string =>
    photos < PLANS.pro.photos
        ? `You've used your ${String(photos)} photos. Remove one, or choose a plan for ${PLANS.pro.photos.toLocaleString("en")}.`
        : `You've used your ${photos.toLocaleString("en")} photos. Remove one to add another.`;

export type LimitsOfPerson = (userId: string) => Promise<Limits>;

const pagesLine = (count: number) => `${String(count)} live ${count === 1 ? "page" : "pages"}`;

/** Why this page can't be published on this plan, and which plans would allow it. */
export const livePageIssue = ({ live }: Limits): PublishIssue =>
    live === 0
        ? { target: "page", message: "Choose a plan to put this page online.", plan: "any" }
        : live < PLANS.pro.live
          ? {
                target: "page",
                message: `Your plan includes ${pagesLine(live)}. Pro includes ${String(PLANS.pro.live)}.`,
                plan: "pro",
            }
          : {
                target: "page",
                message: `Your plan includes ${pagesLine(live)}. Take one down to publish this one.`,
            };
