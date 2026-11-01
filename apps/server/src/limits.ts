import type { Page } from "@tondo/page";

// Every plan limit is checked here, so paid plans only have to change this file.
export interface Limits {
    photos: number;
}

const FREE: Limits = { photos: 200 };

export const limitsFor = (_userId: string): Limits => FREE;

// A hook for a phishing check. Today it's a list set by the operator. A threat feed can replace it.
const blockedHosts = (process.env["BLOCKED_HOSTS"] ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

function linksIn(value: unknown): string[] {
    if (typeof value === "string") return /^https?:\/\//i.test(value) ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(linksIn);
    if (typeof value === "object" && value !== null) return Object.values(value).flatMap(linksIn);
    return [];
}

export function blockedLinks(page: Page, blocked: readonly string[] = blockedHosts): string[] {
    return linksIn(page).filter((url) => {
        if (!URL.canParse(url)) return false;
        const host = new URL(url).hostname.toLowerCase();
        return blocked.some((bad) => host === bad || host.endsWith(`.${bad}`));
    });
}

/** Anything a page can't do on this plan. Nothing yet, because there's only one plan. */
export const planIssues = (_page: Page): string[] => [];
