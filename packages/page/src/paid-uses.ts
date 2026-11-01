import { allBlocks } from "./blocks";
import type { Block } from "./blocks";
import { PAID_BLOCKS } from "./limits";
import { isFreeLook } from "./limits";
import type { Limits } from "./limits";
import { liveContent } from "./sample-content";
import type { LookName, Page } from "./schema";
import { findSection, sectionsOf } from "./sections";
import type { Section, SectionDefinition } from "./sections";

export type PaidCode =
    "look" | "colour" | "font" | "background" | "section" | "schedule" | "too_many";

export interface PaidUse {
    code: PaidCode;
    /** A block to open, or "look" for the look panel. */
    target: string;
    label: string;
}

const isPaidBlock = (block: Block): boolean =>
    (PAID_BLOCKS as readonly string[]).includes(block.type);

export const isScheduled = (block: Block): boolean => Boolean(block.showFrom ?? block.showUntil);

/** Sections a visitor would see, counted the way the plan's limit counts them. */
export const countedSections = (page: Page) =>
    sectionsOf(liveContent(page).page.blocks.filter((block) => !block.hidden));

/** A block already live keeps working after a downgrade, which is how someone can still edit it. */
export function liveBlocks(live: Page | null): Map<string, Block> {
    return new Map(live ? allBlocks(live.blocks).map((block) => [block.id, block]) : []);
}

export const scheduleIsLive = (block: Block, known: Map<string, Block>): boolean => {
    const found = known.get(block.id);
    return found?.showFrom === block.showFrom && found?.showUntil === block.showUntil;
};

type Allowance = Pick<Limits, "design" | "business" | "sections">;

/** Whether a kind of section needs Pro. */
export const isPaidSection = (definition: SectionDefinition): boolean =>
    definition.styles.some((style) => (PAID_BLOCKS as readonly string[]).includes(style.type));

/** Everything on this page that the account's plan doesn't cover, and that would newly go live. */
export const paidUses = (
    page: Page,
    limits: Allowance,
    live: Page | null,
    lookLabel: (look: LookName) => string,
): PaidUse[] => usesIn(page, countedSections(page), limits, live, lookLabel);

/** The same, counting sections still showing sample words, because they're being tried. */
export const triedUses = (
    page: Page,
    limits: Allowance,
    live: Page | null,
    lookLabel: (look: LookName) => string,
): PaidUse[] =>
    usesIn(page, sectionsOf(page.blocks.filter((block) => !block.hidden)), limits, live, lookLabel);

function usesIn(
    page: Page,
    counted: readonly Section[],
    limits: Allowance,
    live: Page | null,
    lookLabel: (look: LookName) => string,
): PaidUse[] {
    const uses: PaidUse[] = [];
    if (!limits.design) {
        if (!isFreeLook(page.look)) {
            uses.push({ code: "look", target: "look", label: lookLabel(page.look) });
        }
        const { colour, font, bg } = page.style ?? {};
        if (colour?.mode === "brand" || colour?.mode === "photo") {
            uses.push({ code: "colour", target: "look", label: "your own colour" });
        }
        if (font) uses.push({ code: "font", target: "look", label: "your own fonts" });
        if (bg === "photo") {
            uses.push({ code: "background", target: "look", label: "a photo background" });
        }
    }
    const known = liveBlocks(live);
    if (!limits.business) {
        const seen = new Set<string>();
        const blocks = allBlocks(counted.flatMap((section) => section.all));
        for (const block of blocks.filter((other) => isPaidBlock(other) && !known.has(other.id))) {
            const found = findSection(page, block.id)?.section;
            const name = found?.definition.name ?? "A section";
            if (seen.has(name)) continue;
            seen.add(name);
            uses.push({ code: "section", target: found?.id ?? block.id, label: name });
        }
        const scheduled = blocks.find(
            (block) => isScheduled(block) && !scheduleIsLive(block, known),
        );
        if (scheduled) {
            const target = findSection(page, scheduled.id)?.section.id ?? scheduled.id;
            uses.push({ code: "schedule", target, label: "scheduling" });
        }
    }
    if (limits.sections !== null) {
        const allowed = Math.max(limits.sections, live ? countedSections(live).length : 0);
        const over = counted[allowed];
        if (over) {
            uses.push({
                code: "too_many",
                target: over.id,
                label: `more than ${String(limits.sections)} sections`,
            });
        }
    }
    return uses;
}
