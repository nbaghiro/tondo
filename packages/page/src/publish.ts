import { allBlocks, blockDefinitions } from "./blocks";
import { isStarterTagline, isUnfilledStarterLink } from "./starters";
import { isPlaceholder } from "./define-block";
import type { Photo } from "./define-block";
import type { Block } from "./blocks";
import { liveContent } from "./sample-content";
import type { Page } from "./schema";
import { findSection } from "./sections";

export interface PublishIssue {
    /** The block to open, or "header", or "add" for the list of sections to add. */
    target: string;
    /** The list item to open, when one item is the problem, or a header field's key. */
    item?: string | undefined;
    message: string;
    /** A link the server refused, so the issue can clear once it's gone from the page. */
    url?: string | undefined;
    /** Set when a plan would solve this, saying which ones to offer. */
    plan?: "any" | "pro" | undefined;
}

interface Problem {
    message: string;
    item?: string;
}

const NEEDS_LINK: Partial<Record<Block["type"], string>> = {
    button: "needs a link.",
    "link-card": "needs a link.",
    music: "needs a link.",
    booking: "needs a link to your booking page.",
    embed: "needs a link.",
};

const quoted = (name: string) => (name ? `"${name}"` : "This item");

function wordsOf(block: Block): string {
    if (block.type === "button") return block.text;
    if ("title" in block && typeof block.title === "string") return block.title;
    return "";
}

function blockProblems(block: Block): Problem[] {
    const definition = blockDefinitions[block.type];
    if (definition.held || definition.layouts[block.variant]?.held) {
        return [
            {
                message: `${definition.name} isn't available yet, so remove it or pick another layout.`,
            },
        ];
    }
    const need = NEEDS_LINK[block.type];
    if (need && "url" in block && !block.url) {
        return [{ message: `${quoted(wordsOf(block))} ${need}` }];
    }
    if (block.type === "video") {
        return block.items
            .filter((entry) => !entry.url)
            .map((entry) => ({ item: entry.id, message: `${quoted(entry.title)} needs a link.` }));
    }
    if (block.type === "products") {
        return block.items
            .filter((entry) => !entry.url)
            .map((entry) => ({
                item: entry.id,
                message: `${quoted(entry.name)} needs a link to where it's sold.`,
            }));
    }
    if (block.type === "contact") {
        return block.items
            .filter((entry) => !entry.value)
            .map((entry) => ({
                item: entry.id,
                message: `Fill in or remove the empty ${entry.type} row.`,
            }));
    }
    return [];
}

const sectionName = (page: Page, id: string) =>
    findSection(page, id)?.section.definition.name ?? "This section";

/** What has to be fixed before a page can go live. A draft may be unfinished, and a live page can't. */
export function publishIssues(page: Page): PublishIssue[] {
    const issues: PublishIssue[] = [];
    const { name, buttonText, buttonUrl } = page.header;
    const links = page.header.links.filter((link) => !isUnfilledStarterLink(link));
    if (!name.trim())
        issues.push({ target: "header", item: "name", message: "Your page needs a name." });
    if (links.some((link) => !link.value)) {
        issues.push({
            target: "header",
            item: links.find((link) => !link.value)?.id ?? "links",
            message: "Top of the page: fill in or remove the empty social icons.",
        });
    }
    if (buttonText && !buttonUrl) {
        issues.push({
            target: "header",
            item: "buttonUrl",
            message: "Top of the page: the button needs a link.",
        });
    }
    const visible = liveContent(page).page;
    const live = allBlocks(visible.blocks).filter((block) => !block.hidden);
    const hasHeader = [
        isStarterTagline(page.header.tagline) ? "" : page.header.tagline,
        page.header.bio,
        buttonText,
    ].some(Boolean);
    const hasOwnTop = hasHeader || Boolean(page.header.photo) || links.length > 0;
    if (!hasOwnTop && !live.some((block) => block.type !== "heading")) {
        issues.push({
            target: "add",
            message: page.unreadable?.length
                ? "There's nothing to show yet. Part of your page couldn't be read, and it's kept safe, so email support to get it back. You can also add a section."
                : "There's nothing to show yet. Add a section, or write a line about yourself.",
        });
    }
    for (const block of live) {
        for (const problem of blockProblems(block)) {
            issues.push({
                target: block.id,
                item: problem.item,
                message: `${sectionName(page, block.id)}: ${problem.message}`,
            });
        }
    }
    return issues;
}

export function photosIn(value: unknown): Photo[] {
    if (Array.isArray(value)) return value.flatMap(photosIn);
    if (typeof value !== "object" || value === null) return [];
    const file = (value as { file?: unknown }).file;
    if (typeof file === "string") return [value as Photo];
    return Object.values(value).flatMap(photosIn);
}

/** Whether a block still has a stand-in where a photo belongs. */
export const hasPlaceholder = (block: Block): boolean => photosIn(block).some(isPlaceholder);

/** Worth a look, but none of these stop a page going live. */
export function publishWarnings(page: Page): PublishIssue[] {
    const { page: visible, leftOut } = liveContent(page);
    const paintings = allBlocks(visible.blocks)
        .filter((block) => !block.hidden && block.type !== "tabs" && hasPlaceholder(block))
        .map((block) => ({
            target: block.id,
            message: `${sectionName(page, block.id)}: has no photo yet. Visitors see a plain tile or no image.`,
        }));
    const seen = new Set<string>();
    const left = leftOut.flatMap((entry) => {
        const message = `${entry.section}: ${entry.note}`;
        const key = `${entry.target}${message}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ target: entry.target, item: entry.item, message }];
    });
    const unreadable = (page.unreadable ?? []).map((block) => ({
        target: "page",
        message: `Something couldn't be read and won't show: ${unreadableName(block)}. It's kept safe, so email support to get it back.`,
    }));
    return numberRepeats([...unreadable, ...left, ...paintings]);
}

function unreadableName(raw: unknown): string {
    const type = (raw as { type?: unknown } | null)?.type;
    const known =
        typeof type === "string" && Object.hasOwn(blockDefinitions, type)
            ? blockDefinitions[type as Block["type"]].name
            : null;
    return known ? `a ${known} section` : "a section";
}

// Two sections of the same kind can have the same problem, so each line has to say which it is.
function numberRepeats(list: PublishIssue[]): PublishIssue[] {
    const total = new Map<string, number>();
    for (const { message } of list) total.set(message, (total.get(message) ?? 0) + 1);
    const seen = new Map<string, number>();
    return list.map((issue) => {
        const of = total.get(issue.message) ?? 1;
        if (of === 1) return issue;
        const at = (seen.get(issue.message) ?? 0) + 1;
        seen.set(issue.message, at);
        const name = issue.message.indexOf(":");
        return {
            ...issue,
            message: `${issue.message.slice(0, name)} (${String(at)} of ${String(of)})${issue.message.slice(name)}`,
        };
    });
}

/** The first thing to fix in a block, for showing beside it while editing. */
export function blockProblem(block: Block): string | null {
    return blockProblems(block)[0]?.message ?? null;
}
