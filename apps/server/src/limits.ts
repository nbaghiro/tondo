import { allBlocks, findSection } from "@tondo/page";
import type { Page, PublishIssue } from "@tondo/page";

// Every plan limit is checked here, so paid plans only have to change this file.
export interface Limits {
    photos: number;
}

const FREE: Limits = { photos: 200 };

export const limitsFor = (_userId: string): Limits => FREE;

// A hook for a phishing check. Today it's a list set by the operator. A threat feed can replace it.
const blockedHosts = (process.env["BLOCKED_HOSTS"] ?? "")
    .split(",")
    .map((host) => hostOf(`https://${host.trim()}`))
    .filter((host): host is string => Boolean(host));

// The URL parser lowers case, drops the port and turns international names into punycode. A final
// dot is the same host too, and would otherwise slip past the list.
function hostOf(url: string): string | null {
    if (!URL.canParse(url)) return null;
    return new URL(url).hostname.toLowerCase().replace(/\.+$/, "") || null;
}

const withScheme = (url: string) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`);

export function isBlockedLink(url: string, blocked: readonly string[] = blockedHosts): boolean {
    const host = hostOf(withScheme(url));
    return host !== null && blocked.some((bad) => host === bad || host.endsWith(`.${bad}`));
}

function linksIn(value: unknown): string[] {
    // Any word can be an address, because a page shows the address even in a sentence.
    if (typeof value === "string") {
        return value
            .split(/\s+/)
            .map((word) => word.replace(/^[("'[]+|[)"'\],;:!?]+$/g, ""))
            .filter(Boolean);
    }
    if (Array.isArray(value)) return value.flatMap(linksIn);
    if (typeof value === "object" && value !== null) return Object.values(value).flatMap(linksIn);
    return [];
}

export function blockedLinks(page: Page, blocked: readonly string[] = blockedHosts): string[] {
    return linksIn(page).filter((url) => isBlockedLink(url, blocked));
}

/** Says where each blocked link is, so the person can go straight to it. */
export function blockedIssues(
    page: Page,
    blocked: readonly string[] = blockedHosts,
): PublishIssue[] {
    const refused = (url: string, where: string) =>
        `${where}: this link can't be used on Tondo (${hostOf(withScheme(url)) ?? url}). Change or remove it.`;
    const header = linksIn(page.header)
        .filter((url) => isBlockedLink(url, blocked))
        .map((url) => ({
            target: "header",
            url,
            message: refused(url, "Top of the page"),
        }));
    const blocks = allBlocks(page.blocks).flatMap((block) =>
        block.type === "tabs"
            ? []
            : linksIn(block)
                  .filter((url) => isBlockedLink(url, blocked))
                  .map((url) => ({
                      target: block.id,
                      url,
                      message: refused(
                          url,
                          findSection(page, block.id)?.section.definition.name ?? "A section",
                      ),
                  })),
    );
    return [...header, ...blocks];
}

/** Anything a page can't do on this plan. Nothing yet, because there's only one plan. */
export const planIssues = (_page: Page): string[] => [];
