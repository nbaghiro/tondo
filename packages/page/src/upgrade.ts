import { PAGE_VERSION, pageSchema } from "./schema";
import type { Page } from "./schema";

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose =>
    typeof value === "object" && value !== null && !Array.isArray(value);

// Before versions, a photo was a name and a position string.
function oldPhoto(owner: Loose): Loose {
    const { photo, position, zoom, ...rest } = owner;
    if (typeof photo !== "string" || !photo) return rest;
    const [x, y] = typeof position === "string" ? position.split(" ").map(parseFloat) : [];
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

export function readPage(raw: unknown): Page {
    return pageSchema.parse(upgradePage(raw));
}

export { PAGE_VERSION };
