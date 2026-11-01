import { allBlocks, blockDefinitions } from "./blocks";
import { isPlaceholder } from "./define-block";
import type { Photo } from "./define-block";
import type { Block } from "./blocks";
import { liveContent } from "./sample-content";
import type { Page } from "./schema";
import { findSection } from "./sections";

export interface PublishIssue {
    /** The block to open, or "header" or "page". */
    target: string;
    /** The list item to open, when one item is the problem. */
    item?: string | undefined;
    message: string;
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
    const { name, links, buttonText, buttonUrl } = page.header;
    if (!name.trim()) issues.push({ target: "header", message: "Your page needs a name." });
    if (links.some((link) => !link.value)) {
        issues.push({
            target: "header",
            message: "Top of the page: fill in or remove the empty social icons.",
        });
    }
    if (buttonText && !buttonUrl) {
        issues.push({ target: "header", message: "Top of the page: the button needs a link." });
    }
    const visible = liveContent(page).page;
    const live = allBlocks(visible.blocks).filter((block) => !block.hidden);
    if (!live.some((block) => block.type !== "tabs" && block.type !== "heading")) {
        issues.push({
            target: "page",
            message: "Change a section to your own words, so there's something to show.",
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

function photosIn(value: unknown): Photo[] {
    if (Array.isArray(value)) return value.flatMap(photosIn);
    if (typeof value !== "object" || value === null) return [];
    const file = (value as { file?: unknown }).file;
    if (typeof file === "string") return [value as Photo];
    return Object.values(value).flatMap(photosIn);
}

/** Whether a block still shows a painted stand-in where a photo belongs. */
export const hasPlaceholder = (block: Block): boolean => photosIn(block).some(isPlaceholder);

/** Worth a look, but none of these stop a page going live. */
export function publishWarnings(page: Page): PublishIssue[] {
    const { page: visible, leftOut } = liveContent(page);
    const paintings = allBlocks(visible.blocks)
        .filter((block) => !block.hidden && block.type !== "tabs" && hasPlaceholder(block))
        .map((block) => ({
            target: block.id,
            message: `${sectionName(page, block.id)}: still shows a painting where your photo could go.`,
        }));
    const left = leftOut.map((entry) => ({
        target: entry.target,
        item: entry.item,
        message: `${entry.section}: "${entry.words}" is sample text, so it won't show.`,
    }));
    return [...left, ...paintings];
}

/** The first thing to fix in a block, for showing beside it while editing. */
export function blockProblem(block: Block): string | null {
    return blockProblems(block)[0]?.message ?? null;
}
