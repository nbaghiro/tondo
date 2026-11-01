import { allBlocks, blockDefinitions, blockTypes } from "./blocks";
import type { Block } from "./blocks";
import type { Field } from "./fields";
import type { Page } from "./schema";
import { sectionDefinitions, sectionsOf } from "./sections";

// A new section starts filled with words that show how it looks. Those words aren't the person's,
// so a live page leaves them out until they've been changed. Nothing is stored to say what's been
// touched: a block or list item is sample content while it still equals what it started as.

type Values = Readonly<Record<string, unknown>>;

const NOT_CONTENT = new Set([
    "id",
    "type",
    "variant",
    "section",
    "tint",
    "hidden",
    "showFrom",
    "showUntil",
    "highlight",
    "source",
    // Sample dates are worked out from today, so they can't be compared.
    "at",
]);

const isList = (value: unknown): value is Values[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);

const scalars = (values: Values) =>
    Object.entries(values)
        .filter(
            ([key, value]) =>
                !NOT_CONTENT.has(key) && !isList(value) && value !== "" && value !== undefined,
        )
        .sort(([a], [b]) => a.localeCompare(b));

const signature = (values: Values) => JSON.stringify(scalars(values));
/** A photo or a spacer says nothing, so it can't be mistaken for someone else's words. */
const hasWords = (values: Values) => scalars(values).some(([, value]) => typeof value === "string");

interface Samples {
    blocks: Set<string>;
    items: Set<string>;
}

function collectFromFields(fields: readonly Field[], into: Samples) {
    for (const field of fields) {
        if (field.kind !== "list") continue;
        into.items.add(signature(field.make()));
        collectFromFields(field.fields, into);
    }
}

function collect(seed: Values, into: Samples) {
    into.blocks.add(signature(seed));
    for (const value of Object.values(seed)) {
        if (!isList(value)) continue;
        for (const entry of value) into.items.add(signature(entry));
    }
}

let cached: Map<string, Samples> | null = null;

function samples(): Map<string, Samples> {
    if (cached) return cached;
    const map = new Map<string, Samples>();
    const of = (type: string) => {
        let found = map.get(type);
        if (!found) {
            found = { blocks: new Set(), items: new Set() };
            map.set(type, found);
        }
        return found;
    };
    for (const type of blockTypes) {
        const definition = blockDefinitions[type];
        collect(definition.make(), of(type));
        collectFromFields(definition.fields, of(type));
    }
    for (const definition of sectionDefinitions) {
        for (const style of definition.styles) {
            for (const seed of definition.sample(style)) collect(seed, of(seed.type));
        }
    }
    cached = map;
    return map;
}

export interface LeftOut {
    /** The block to open. */
    target: string;
    /** The list item to open, when only part of the block was left out. */
    item?: string;
    /** The section's name, then the words that were left out. */
    section: string;
    words: string;
}

const firstWords = (values: Values): string => {
    const found = scalars(values).find(
        ([key, value]) => typeof value === "string" && key !== "url" && key !== "kind",
    );
    return typeof found?.[1] === "string" ? found[1] : "";
};

function trimBlock(block: Block, name: string, leftOut: LeftOut[]): Block | null {
    const known = samples().get(block.type);
    if (!known) return block;
    // A form's starting questions and a tip jar's amounts are what most people would really use.
    if (block.type === "form" || block.type === "tip") {
        if (!known.blocks.has(signature(block))) return block;
        leftOut.push({ target: block.id, section: name, words: firstWords(block) });
        return null;
    }
    let next: Values = block;
    for (const [key, value] of Object.entries(block)) {
        if (!isList(value) || key === "tabs" || !value.length) continue;
        const kept = value.filter((entry) => {
            // A row with nothing in it yet is the same as one still showing sample words.
            const blank = !scalars(entry).length;
            const sample = blank || (hasWords(entry) && known.items.has(signature(entry)));
            if (!sample) return true;
            leftOut.push({
                target: block.id,
                ...(typeof entry["id"] === "string" ? { item: entry["id"] } : {}),
                section: name,
                words: firstWords(entry),
            });
            return false;
        });
        if (kept.length !== value.length) next = { ...next, [key]: kept };
    }
    const lists = Object.entries(block).filter(([key, value]) => key !== "tabs" && isList(value));
    if (lists.length) {
        const emptied = lists.every(([key]) => {
            const value = next[key];
            return isList(value) && !value.length;
        });
        return next !== block && emptied ? null : (next as Block);
    }
    if (hasWords(block) && known.blocks.has(signature(block))) {
        leftOut.push({ target: block.id, section: name, words: firstWords(block) });
        return null;
    }
    return block;
}

function trimBlocks(blocks: readonly Block[], leftOut: LeftOut[]): Block[] {
    return sectionsOf(blocks).flatMap((section) => {
        const name = section.definition.name;
        const kept = section.blocks.flatMap((block): Block[] => {
            if (block.type !== "tabs") {
                const trimmed = trimBlock(block, name, leftOut);
                return trimmed ? [trimmed] : [];
            }
            const tabs = block.tabs
                .map((tab) => ({
                    ...tab,
                    blocks: trimBlocks(tab.blocks, leftOut) as typeof tab.blocks,
                }))
                .filter((tab) => tab.blocks.length);
            // Tabs need at least two, so one left over is just its blocks, with no tab bar.
            if (tabs.length < 2) return tabs.flatMap((tab) => tab.blocks);
            return [{ ...block, tabs }];
        });
        if (!kept.length) return [];
        return section.title ? [section.title, ...kept] : kept;
    });
}

/** The page a visitor sees: no untouched sample content, and no empty tabs. */
export function liveContent(page: Page): { page: Page; leftOut: LeftOut[] } {
    const leftOut: LeftOut[] = [];
    const blocks = trimBlocks(page.blocks, leftOut);
    return { page: { ...page, blocks }, leftOut };
}

/** Whether a section still has nothing of the person's own in it. */
export const isAllSample = (blocks: readonly Block[]): boolean =>
    allBlocks(blocks).length > 0 && trimBlocks(blocks, []).length === 0;
