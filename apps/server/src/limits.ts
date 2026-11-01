import { limitsFor, paidUses, PLANS } from "@tondo/page";
import type { Account, AccountLimits, Limits, Page, PublishIssue } from "@tondo/page";
import { looks } from "@tondo/render";

export const plansOn = (): boolean => process.env["PLANS_ON"] === "true";

// Until checkout works, asking for a payment would be a dead end, so everyone behaves as Pro. Help me
// costs money per use, so its credits don't rise with that, unless set locally to try other limits.
export function limitsOf(account: Account, now = new Date()): AccountLimits {
    if (plansOn()) return limitsFor(account, now);
    const credits = process.env["TONDO_PLAN"] === "pro" ? PLANS.pro.credits : PLANS.free.credits;
    return { ...PLANS.pro, credits, designUntil: null };
}

export const photoLimitMessage = ({ photos }: { photos: number }): string =>
    photos < PLANS.pro.photos
        ? `You've used your ${String(photos)} photos. Remove one, or get ${PLANS.pro.photos.toLocaleString("en")} with Pro.`
        : `You've used your ${photos.toLocaleString("en")} photos. Remove one to add another.`;

export type LimitsOfPerson = (userId: string) => Promise<AccountLimits>;

/** What a page uses that its owner's plan doesn't cover, marked so the editor can offer a way on. */
export const planIssues = (page: Page, limits: Limits, live: Page | null): PublishIssue[] =>
    paidUses(page, limits, live, (look) => looks[look].label).map((use) => ({
        target: use.target,
        message: `This page uses ${use.label}, which is part of Pro.`,
        plan: use.code,
    }));
