import { blockDefinitions, blockSchemaUnion, leafSchemaUnion } from "./blocks";
import { readLink } from "./links";
import type { Block, BlockType, LeafBlock } from "./blocks";
import { pageSchema } from "./schema";
import type { Header, Page } from "./schema";

// Every change to a page goes through here, whether it comes from the editor, an API or an importer.

/** Where a block lives. Leaving this out means the top of the page. */
export interface Place {
    tabs: string;
    tab: string;
}

export type MakeId = () => string;

export const HEADER = "header";

export function newBlock(type: BlockType, id: string): Block {
    return blockSchemaUnion.parse({ id, ...blockDefinitions[type].make() });
}

function listAt(page: Page, place: Place | undefined): readonly Block[] {
    if (!place) return page.blocks;
    const tabs = page.blocks.find((block) => block.id === place.tabs);
    if (tabs?.type !== "tabs") return [];
    return tabs.tabs.find((tab) => tab.id === place.tab)?.blocks ?? [];
}

function withList(page: Page, place: Place | undefined, list: Block[]): Page {
    if (!place) return { ...page, blocks: list };
    const leaves = list.filter((block): block is LeafBlock => block.type !== "tabs");
    return {
        ...page,
        blocks: page.blocks.map((block) =>
            block.id === place.tabs && block.type === "tabs"
                ? {
                      ...block,
                      tabs: block.tabs.map((tab) =>
                          tab.id === place.tab ? { ...tab, blocks: leaves } : tab,
                      ),
                  }
                : block,
        ),
    };
}

const SERVICE_BLOCKS: Readonly<Record<string, BlockType>> = {
    YouTube: "video",
    Vimeo: "video",
    Spotify: "music",
    "Apple Music": "music",
    SoundCloud: "music",
    Calendly: "booking",
    "Cal.com": "booking",
};

/** The block a pasted link should become, already pointing at it. Null if it isn't a usable link. */
export function blockFromLink(raw: string, id: string): Block | null {
    const reading = readLink(raw);
    if (reading.state !== "ok") return null;
    const { url, title, service } = reading;
    const type = (service ? SERVICE_BLOCKS[service] : undefined) ?? "button";
    const made = newBlock(type, id);
    if (made.type === "video") {
        const [first] = made.items;
        if (!first) return made;
        return { ...made, items: [{ ...first, url, title: title || first.title }] };
    }
    if (made.type === "button") return { ...made, url, text: title || "Visit my site" };
    if (made.type === "music" || made.type === "booking") {
        return { ...made, url, title: title || made.title };
    }
    return made;
}

/** Finds a block anywhere on the page, and where it lives. */
export function findBlock(
    page: Page,
    id: string,
): { block: Block; place: Place | undefined; index: number } | null {
    const top = page.blocks.findIndex((block) => block.id === id);
    const found = page.blocks[top];
    if (found) return { block: found, place: undefined, index: top };
    for (const block of page.blocks) {
        if (block.type !== "tabs") continue;
        for (const tab of block.tabs) {
            const index = tab.blocks.findIndex((inner) => inner.id === id);
            const inner = tab.blocks[index];
            if (inner) return { block: inner, place: { tabs: block.id, tab: tab.id }, index };
        }
    }
    return null;
}

export function addBlock(page: Page, block: Block, at: number, place?: Place): Page {
    // Tabs can't hold tabs, which keeps every page editable on a phone.
    if (place && block.type === "tabs") return page;
    const list = [...listAt(page, place)];
    list.splice(at, 0, block);
    return withList(page, place, list);
}

/** Moves a block within its own list. */
export function moveBlock(page: Page, id: string, to: number): Page {
    const found = findBlock(page, id);
    if (!found) return page;
    const list = [...listAt(page, found.place)];
    if (to < 0 || to >= list.length || to === found.index) return page;
    list.splice(found.index, 1);
    list.splice(to, 0, found.block);
    return withList(page, found.place, list);
}

export function removeBlock(page: Page, id: string): Page {
    const found = findBlock(page, id);
    if (!found) return page;
    return withList(
        page,
        found.place,
        listAt(page, found.place).filter((block) => block.id !== id),
    );
}

// Statistics and undo rely on ids, so a copy gets new ones all the way down.
function withNewIds<T>(value: T, makeId: MakeId): T {
    if (Array.isArray(value)) return value.map((item: unknown) => withNewIds(item, makeId)) as T;
    if (typeof value !== "object" || value === null) return value;
    const copy = Object.fromEntries(
        Object.entries(value).map(([key, inner]) => [
            key,
            key === "id" ? makeId() : withNewIds(inner as unknown, makeId),
        ]),
    );
    return copy as T;
}

/** Returns the page and the new block's id, placed directly below the original. */
export function duplicateBlock(page: Page, id: string, makeId: MakeId): [Page, string | null] {
    const found = findBlock(page, id);
    if (!found) return [page, null];
    const { highlight: _highlight, ...rest } = found.block;
    const copy = withNewIds(rest, makeId) as Block;
    return [addBlock(page, copy, found.index + 1, found.place), copy.id];
}

// Empty values are left out when the schema allows it, so documents stay small.
function withValue(owner: object, key: string, value: unknown): [object, object] {
    const { [key as never]: _old, ...without } = owner as Record<string, unknown>;
    return [without, { ...owner, [key]: value }];
}

// A key like "items.0.title" reaches inside a list, for text edited in place on the canvas.
function withPath(owner: Record<string, unknown>, path: string[], value: unknown): unknown {
    const [head = "", ...rest] = path;
    if (!rest.length) return { ...owner, [head]: value };
    const inner = owner[head];
    if (Array.isArray(inner)) {
        const index = Number(rest[0]);
        return {
            ...owner,
            [head]: inner.map((entry: Record<string, unknown>, i) =>
                i === index ? withPath(entry, rest.slice(1), value) : entry,
            ),
        };
    }
    return owner;
}

function parseWith<T extends object>(
    owner: T,
    key: string,
    value: unknown,
    parse: (candidate: object) => { success: boolean; data?: T },
): T | null {
    if (key.includes(".")) {
        const nested = parse(
            withPath(owner as Record<string, unknown>, key.split("."), value) as object,
        );
        return nested.success && nested.data ? nested.data : null;
    }
    const [without, withIt] = withValue(owner, key, value);
    if (value === "" || value === undefined || value === false) {
        const left = parse(without);
        if (left.success && left.data) return left.data;
    }
    const set = parse(withIt);
    return set.success && set.data ? set.data : null;
}

/** Returns the page unchanged if the value isn't allowed, such as text over a block's limit. */
export function setBlockField(page: Page, id: string, key: string, value: unknown): Page {
    const found = findBlock(page, id);
    if (!found) return page;
    const schema = found.place ? leafSchemaUnion : blockSchemaUnion;
    const next = parseWith<Block>(found.block, key, value, (candidate) =>
        schema.safeParse(candidate),
    );
    if (!next) return page;
    const list = listAt(page, found.place).map((block) => (block.id === id ? next : block));
    return withList(page, found.place, list);
}

export function setHeaderField(page: Page, key: string, value: unknown): Page {
    const next = parseWith<Header>(page.header, key, value, (candidate) => {
        const parsed = pageSchema.safeParse({ ...page, header: candidate });
        return parsed.success ? { success: true, data: parsed.data.header } : { success: false };
    });
    return next ? { ...page, header: next } : page;
}

export function ownerOf(page: Page, target: string): Header | Block | null {
    return target === HEADER ? page.header : (findBlock(page, target)?.block ?? null);
}

export function getField(page: Page, target: string, key: string): unknown {
    const owner = ownerOf(page, target);
    if (!owner) return undefined;
    return key.split(".").reduce<unknown>((value, part) => {
        if (value === null || typeof value !== "object") return undefined;
        return Object.entries(value).find(([name]) => name === part)?.[1];
    }, owner);
}

/** How many highlights a page may have. More than this and nothing stands out. */
export const MAX_HIGHLIGHTS = 2;
