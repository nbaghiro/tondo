import { blockSchemaUnion } from "./blocks";
import { headerSchema, PAGE_VERSION, pageSchema } from "./schema";
import type { Page } from "./schema";

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose =>
    typeof value === "object" && value !== null && !Array.isArray(value);

// Before versions, a photo was a name and a position string.
function oldPhoto(owner: Loose): Loose {
    const { photo, position, zoom, ...rest } = owner;
    if (typeof photo !== "string" || !photo) return rest;
    // Words such as "center" aren't numbers, and the crop point falls back to the middle.
    const [x, y] = (typeof position === "string" ? position.split(" ").map(parseFloat) : []).map(
        (value) => (Number.isFinite(value) ? value : undefined),
    );
    return {
        ...rest,
        photo: {
            file: `${photo}.jpg`,
            ...(x === undefined ? {} : { x }),
            ...(y === undefined ? {} : { y }),
            ...(typeof zoom === "number" ? { zoom } : {}),
        },
    };
}

function fromUnversioned(raw: Loose): Loose {
    const header = isObject(raw["header"]) ? oldPhoto(raw["header"]) : {};
    const { social, ...restHeader } = header;
    const links = Array.isArray(social) ? social.filter(isObject) : [];
    return {
        ...raw,
        version: 1,
        header: {
            ...restHeader,
            layout: "look",
            links: links.map((link, i) => ({
                id: `link${String(i)}`,
                type: link["network"],
                value: link["url"],
            })),
        },
        blocks: (Array.isArray(raw["blocks"]) ? raw["blocks"] : []).map((block: unknown) =>
            isObject(block) ? oldPhoto(block) : block,
        ),
    };
}

const isLinkBlock = (block: Loose) =>
    block["type"] === "button" ||
    (block["type"] === "link-card" &&
        (block["variant"] === "small" || block["variant"] === "icon"));

// Version 1 had no sections. A heading joins what follows it, and links in a row become one section.
function fromOne(raw: Loose): Loose {
    const blocks = Array.isArray(raw["blocks"]) ? raw["blocks"].filter(isObject) : [];
    let section = "";
    const grouped = blocks.map((block, i) => {
        const before = blocks[i - 1];
        const id = typeof block["id"] === "string" ? block["id"] : `b${String(i)}`;
        const joins =
            before?.["type"] === "heading" || (before && isLinkBlock(before) && isLinkBlock(block));
        if (!joins) section = id;
        return { ...block, section };
    });
    return { ...raw, version: 2, blocks: grouped };
}

/** Brings a saved document up to the current version, so a changed block needs no database work. */
export function upgradePage(raw: unknown): unknown {
    if (!isObject(raw)) return raw;
    const one = raw["version"] === undefined ? fromUnversioned(raw) : raw;
    return one["version"] === 1 ? fromOne(one) : one;
}

// Keeps each header field that's still valid, and fills in what a page can't go without.
function readHeader(raw: unknown): unknown {
    const header = isObject(raw) ? raw : {};
    const kept: Loose = { layout: "look", name: "", links: [] };
    for (const [key, value] of Object.entries(header)) {
        const field = headerSchema.shape[key as keyof typeof headerSchema.shape] as
            { safeParse: (input: unknown) => { success: boolean } } | undefined;
        if (field?.safeParse(value).success) kept[key] = value;
    }
    return kept;
}

/**
 * Reads a saved page, whatever state it's in. A block that can't be read is set aside and kept, so
 * one bad block can't take down the live page or lose someone's work.
 */
export function readPage(raw: unknown): Page {
    const upgraded = upgradePage(raw);
    const whole = pageSchema.safeParse(upgraded);
    if (whole.success) return whole.data;
    const loose = isObject(upgraded) ? upgraded : {};
    const listOf = (value: unknown): unknown[] =>
        Array.isArray(value) ? (value as unknown[]) : [];
    const blocks = listOf(loose["blocks"]);
    const readable = blocks.filter((block) => blockSchemaUnion.safeParse(block).success);
    const unreadable = [
        ...listOf(loose["unreadable"]),
        ...blocks.filter((block) => !blockSchemaUnion.safeParse(block).success),
    ].slice(0, 200);
    const candidate: Loose = {
        version: PAGE_VERSION,
        look: "madder",
        header: readHeader(loose["header"]),
        blocks: readable.slice(0, 200),
        ...(unreadable.length ? { unreadable } : {}),
    };
    for (const key of ["look", "title", "description", "paint", "seed", "style", "timeZone"]) {
        if (loose[key] === undefined) continue;
        const shape = pageSchema.shape[key as keyof typeof pageSchema.shape] as {
            safeParse: (input: unknown) => { success: boolean };
        };
        if (shape.safeParse(loose[key]).success) candidate[key] = loose[key];
    }
    return pageSchema.parse(candidate);
}

/** Tells whether two saves hold the same page, whatever order their keys are in. */
export function pageHash(page: Page): string {
    const sorted = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(sorted);
        if (!isObject(value)) return value;
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, sorted(value[key])]),
        );
    };
    const text = JSON.stringify(sorted(page));
    let a = 0x811c9dc5;
    let b = 0x1b873593;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        a = Math.imul(a ^ code, 16777619);
        b = Math.imul(b ^ code, 2654435761);
    }
    return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}${String(text.length)}`;
}

export { PAGE_VERSION };
