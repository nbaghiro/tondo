import { blockDefinitions, blockTypes } from "./blocks";
import { isSampleTime } from "./blocks/parts";
import type { Block } from "./blocks";
import { isPlaceholder } from "./define-block";
import type { Photo } from "./define-block";
import type { Field } from "./fields";
import { linkName } from "./links";
import type { Page } from "./schema";
import { sectionDefinitions, sectionsOf } from "./sections";

// A new section starts filled with words that show how it looks. Those words aren't the person's,
// so a live page leaves them out until they've been changed. Nothing is stored to say what's been
// touched: each field is compared with what it could have started as. A field still showing sample
// words is empty on the live page, and a field the person changed always stays.

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
    "kind",
    "count",
    "popular",
    "slots",
    "progress",
]);

interface Rule {
    /** Plain wording that makes sense for anyone, so it stays once something else is theirs. */
    keep?: readonly string[];
    /** Sample words that would claim something, so the block's link names it instead. */
    named?: readonly string[];
    /** A row without one of these of their own means nothing to a visitor, so it's left out. */
    needs?: readonly string[];
    /** The same, when both halves are needed. */
    needsAll?: readonly string[];
    /** What to ask for when a row is left out for that reason. */
    asks?: string;
}

/** What each block does with a part-finished row. Anything not listed just loses its sample fields. */
const RULES: Readonly<Record<string, Rule>> = {
    button: { named: ["text"] },
    "link-card": { named: ["title"] },
    booking: { keep: ["cta"], named: ["title"] },
    music: { named: ["title"] },
    countdown: { keep: ["label"] },
    events: { keep: ["cta"] },
    services: { keep: ["cta"] },
    signup: { keep: ["cta"] },
    "video.items": { named: ["title"] },
    "products.items": { needs: ["name", "photo"], asks: "its own name" },
    "services.items": { needs: ["name"], asks: "its own name" },
    "events.items": { needs: ["name", "at", "place"], asks: "a name, date or place" },
    "quotes.items": { needs: ["text"], asks: "the words someone really said" },
    "faq.items": { needsAll: ["question", "answer"], asks: "your own question and answer" },
    "stats.items": { keep: ["label"], needs: ["number"], asks: "your own number" },
    "team.items": { needs: ["name", "photo"], asks: "a real name or photo" },
    "timeline.items": { needs: ["title"], asks: "its own title" },
    "posts.items": { needs: ["title"], asks: "its own title" },
    "location.hours": { keep: ["days"] },
};

/** Blocks that are their own starting point: a form's questions and a tip jar's amounts are real. */
const WHOLE = new Set(["form", "tip"]);

/** Dividers and photo layouts have no words to mistake for someone else's, so they always stay. */
const PICTURES = new Set(["divider", "image", "gallery"]);

const isList = (value: unknown): value is Values[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === "object" && entry !== null);
const isEmpty = (value: unknown) => value === "" || value === undefined || value === null;
const isPhoto = (value: unknown): value is Photo =>
    typeof value === "object" && value !== null && "file" in value && !("size" in value);

type Samples = Map<string, Set<string>>;

function remember(into: Samples, path: string, value: unknown) {
    if (isEmpty(value)) return;
    const known = into.get(path) ?? new Set<string>();
    known.add(JSON.stringify(value));
    into.set(path, known);
}

function collect(into: Samples, seed: Values, prefix = "") {
    for (const [key, value] of Object.entries(seed)) {
        if (NOT_CONTENT.has(key)) continue;
        if (isList(value)) {
            for (const entry of value) collect(into, entry, `${prefix}${key}.`);
        } else {
            remember(into, `${prefix}${key}`, value);
        }
    }
}

function collectFields(into: Samples, fields: readonly Field[], prefix = "") {
    for (const field of fields) {
        if (field.kind !== "list") continue;
        const path = `${prefix}${field.key}.`;
        collect(into, field.make(), path);
        collectFields(into, field.fields, path);
    }
}

let cached: Map<string, Samples> | null = null;

function samples(): Map<string, Samples> {
    if (cached) return cached;
    const map = new Map<string, Samples>();
    const of = (type: string) => {
        const found = map.get(type) ?? new Map<string, Set<string>>();
        map.set(type, found);
        return found;
    };
    for (const type of blockTypes) {
        const definition = blockDefinitions[type];
        collect(of(type), definition.make());
        collectFields(of(type), definition.fields);
    }
    for (const definition of sectionDefinitions) {
        for (const style of definition.styles) {
            for (const seed of definition.sample(style)) collect(of(seed.type), seed);
        }
    }
    cached = map;
    return map;
}

/** Whether a value is the person's own, and not something the block started with. */
function isOwn(known: Samples | undefined, path: string, key: string, value: unknown): boolean {
    if (isEmpty(value)) return false;
    if (key === "at") return typeof value === "string" && !isSampleTime(value);
    if (isPhoto(value) && isPlaceholder(value)) return false;
    return !known?.get(path)?.has(JSON.stringify(value));
}

/** One line for the publish list about what a block is leaving out. */
export interface LeftOut {
    /** The block to open. */
    target: string;
    /** The list item to open, when one item is the problem. */
    item?: string;
    /** The section's name. */
    section: string;
    /** What's left out, as the end of a sentence. */
    note: string;
}

function labelOf(fields: readonly Field[], key: string): string {
    const found = fields.find((field) => field.key === key);
    return found?.label.toLowerCase() ?? key;
}

const plural = (count: number, one: string) => `${String(count)} ${one}${count === 1 ? "" : "s"}`;

function trimRow(
    known: Samples | undefined,
    block: string,
    key: string,
    entry: Values,
): { row: Values | null; own: boolean; asked: boolean; blanked: boolean } {
    const prefix = `${key}.`;
    const rule = RULES[`${block}.${key}`] ?? {};
    const mine = (field: string) => isOwn(known, `${prefix}${field}`, field, entry[field]);
    const fields = Object.keys(entry).filter((field) => !NOT_CONTENT.has(field));
    const own = fields.some(mine);
    const needed =
        (!rule.needs || rule.needs.some(mine)) && (!rule.needsAll || rule.needsAll.every(mine));
    if (!own || !needed) return { row: null, own, asked: own, blanked: false };
    const next: Record<string, unknown> = { ...entry };
    let blanked = false;
    for (const field of fields) {
        if (mine(field) || isEmpty(entry[field]) || isPhoto(entry[field])) continue;
        if (rule.keep?.includes(field)) continue;
        next[field] = rule.named?.includes(field) ? linkName(entry["url"]) : "";
        blanked = true;
    }
    return { row: next, own, asked: false, blanked };
}

function keepPictures(block: Block, known: Samples | undefined): Block {
    const values: Values = block;
    const next: Record<string, unknown> = { ...values };
    for (const key of ["caption", "alt"]) {
        if (typeof values[key] === "string" && !isOwn(known, key, key, values[key])) next[key] = "";
    }
    return next as Block;
}

function trimBlock(block: Block, section: string, leftOut: LeftOut[]): Block | null {
    const known = samples().get(block.type);
    const definition = blockDefinitions[block.type];
    const values: Values = block;
    const fields = Object.keys(values).filter((key) => !NOT_CONTENT.has(key));
    const say = (note: string, item?: string) => {
        leftOut.push({ target: block.id, ...(item ? { item } : {}), section, note });
    };
    if (PICTURES.has(block.type)) return keepPictures(block, known);

    const hasOwnList = (key: string) =>
        (values[key] as Values[]).some((entry) =>
            Object.keys(entry).some(
                (field) =>
                    !NOT_CONTENT.has(field) && isOwn(known, `${key}.${field}`, field, entry[field]),
            ),
        );
    const scalarOwn = (key: string) => isOwn(known, key, key, values[key]);
    if (WHOLE.has(block.type)) {
        const own = fields.some((key) => (isList(values[key]) ? hasOwnList(key) : scalarOwn(key)));
        if (!own) say("still has its sample words, so it won't show yet.");
        return own ? block : null;
    }

    const rule = RULES[block.type] ?? {};
    const next: Record<string, unknown> = { ...values };
    let own = false;
    let hadContent = false;
    const blanks: string[] = [];
    const asks: { note: string; item?: string | undefined }[] = [];
    const notes: { note: string; item?: string | undefined }[] = [];
    for (const key of fields) {
        const value = values[key];
        if (isEmpty(value)) continue;
        if (isList(value)) {
            const kept: Values[] = [];
            let dropped = 0;
            let thinned = 0;
            let firstDropped: string | undefined;
            for (const entry of value) {
                hadContent = true;
                const id = typeof entry["id"] === "string" ? entry["id"] : undefined;
                const result = trimRow(known, block.type, key, entry);
                if (result.row) {
                    kept.push(result.row);
                    own = true;
                    if (result.blanked) thinned += 1;
                    continue;
                }
                if (result.asked) {
                    const ask = RULES[`${block.type}.${key}`]?.asks ?? "your own words";
                    asks.push({ note: `one item won't show until it has ${ask}.`, item: id });
                } else {
                    dropped += 1;
                    firstDropped ??= id;
                }
            }
            next[key] = kept;
            if (dropped) {
                notes.push({
                    note: `${plural(dropped, "sample item")} won't show.`,
                    item: firstDropped,
                });
            }
            if (thinned)
                notes.push({ note: `sample words in ${plural(thinned, "item")} won't show.` });
            continue;
        }
        hadContent = true;
        if (scalarOwn(key)) {
            own = true;
        } else if (!isPhoto(value) && !rule.keep?.includes(key)) {
            next[key] = rule.named?.includes(key) ? linkName(values["url"]) : "";
            blanks.push(key);
        }
    }
    for (const { note, item } of asks) say(note, item);
    if (!own) {
        if (hadContent && !asks.length) say("still has its sample words, so it won't show yet.");
        return null;
    }
    for (const { note, item } of notes) say(note, item);
    if (blanks.length) {
        const names = blanks.map((key) => labelOf(definition.fields, key)).join(", ");
        say(`the sample ${names} won't show.`);
    }
    return next as Block;
}

/** A title on its own says nothing, so it only goes live with something under it. */
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

/** Whether a section's going to show on the live page as it stands. */
export const goesLive = (blocks: readonly Block[]): boolean => trimBlocks(blocks, []).length > 0;
