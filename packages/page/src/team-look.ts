import type { Page } from "./schema";

/** What a team shares. Each page keeps its own words, photos, header and painting. */
export type TeamLook = Pick<Page, "look" | "paint" | "style">;

export const teamLookOf = ({ look, paint, style }: TeamLook): TeamLook => ({
    look,
    ...(paint ? { paint } : {}),
    ...(style ? { style } : {}),
});

/** The team's own value is used even when it's absent, so a person's colours can't show through. */
export function withTeamLook(page: Page, team: TeamLook | null): Page {
    if (!team) return page;
    const own: Page = { ...page };
    delete own.paint;
    delete own.style;
    return { ...own, ...team };
}

const keyOf = ({ look, paint, style }: TeamLook) =>
    JSON.stringify([look, paint ?? null, style ?? null]);

export const sameTeamLook = (a: TeamLook, b: TeamLook): boolean => keyOf(a) === keyOf(b);
