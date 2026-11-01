import { allBlocks, blockDefinitions } from "./blocks";
import type { Block } from "./blocks";
import type { Page } from "./schema";

export interface PublishIssue {
    /** The block to open, or "header". */
    target: string;
    message: string;
}

const NEEDS_LINK: Partial<Record<Block["type"], string>> = {
    button: "This button needs a link.",
    "link-card": "This link card needs a link.",
    music: "This music block needs a link.",
    booking: "This booking block needs a link to your booking page.",
    embed: "This embed needs a link.",
};

function blockIssues(block: Block): string[] {
    const definition = blockDefinitions[block.type];
    if (definition.held || definition.layouts[block.variant]?.held) {
        return [`${definition.name} isn't available yet, so remove it or pick another layout.`];
    }
    const linkMessage = NEEDS_LINK[block.type];
    if (linkMessage && "url" in block && !block.url) return [linkMessage];
    if (block.type === "video" && block.items.some((entry) => !entry.url)) {
        return ["Every video here needs a link."];
    }
    if (block.type === "products" && block.items.some((entry) => !entry.url)) {
        return ["Every product here needs a link to where it's sold."];
    }
    if (block.type === "contact" && block.items.some((entry) => !entry.value)) {
        return ["Fill in or remove the empty ways to reach you."];
    }
    return [];
}

/** What has to be fixed before a page can go live. A draft may be unfinished, and a live page can't. */
export function publishIssues(page: Page): PublishIssue[] {
    const issues: PublishIssue[] = [];
    const { name, links, buttonText, buttonUrl } = page.header;
    if (!name.trim()) issues.push({ target: "header", message: "Your page needs a name." });
    if (links.some((link) => !link.value)) {
        issues.push({
            target: "header",
            message: "Fill in or remove the empty links in your header.",
        });
    }
    if (buttonText && !buttonUrl) {
        issues.push({ target: "header", message: "Your header's button needs a link." });
    }
    const live = allBlocks(page.blocks).filter((block) => !block.hidden);
    if (!live.some((block) => block.type !== "tabs")) {
        issues.push({ target: "page", message: "Add at least one block to your page." });
    }
    for (const block of live) {
        for (const message of blockIssues(block)) issues.push({ target: block.id, message });
    }
    return issues;
}
