import { allBlocks, readPage } from "@tondo/page";
import type { Block, Page } from "@tondo/page";

// The gallery's pages are drawn as of this date, so their countdowns and events don't run out.
export const GALLERY_DATE = new Date("2026-10-31T00:00:00Z");

const files = import.meta.glob<unknown>("../data/pages/*.json", { import: "default", eager: true });

export function examplePage(handle: string): Page {
    return readPage(files[`../data/pages/${handle}.json`]);
}

export function firstBlock(handle: string, type: Block["type"]): Block {
    const found = allBlocks(examplePage(handle).blocks).find((block) => block.type === type);
    if (!found) throw new Error(`${handle} has no ${type} block.`);
    return found;
}
