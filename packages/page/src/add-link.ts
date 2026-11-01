import { readLink } from "./links";
import type { Block } from "./blocks";
import { setBlockField } from "./operations";
import type { MakeId, Place } from "./operations";
import type { Page } from "./schema";
import {
    addLinkToSection,
    addSection,
    findSection,
    makeSection,
    routeLink,
    sectionDefinition,
    sectionsOf,
} from "./sections";

const isList = (block: Block) => block.type === "button" || block.type === "link-card";

/** Where a new section goes. Leaving this out means the end of the page. */
export type PlaceSection = (page: Page, blocks: Block[]) => { at: number; list?: Place };

const atEnd: PlaceSection = (page) => ({ at: sectionsOf(page.blocks).length });

export interface AddedLink {
    page: Page;
    section: string;
    name: string;
    /** True when the link needed a new section. */
    made: boolean;
}

/** Puts a pasted link where it belongs. Null if it isn't a usable link. */
export function addFromLink(
    start: Page,
    raw: string,
    makeId: MakeId,
    place: PlaceSection = atEnd,
): AddedLink | null {
    const reading = readLink(raw);
    if (reading.state !== "ok") return null;
    const { key } = routeLink(reading.url);
    const definition = sectionDefinition(key);
    if (!definition) return null;
    const styleId =
        key === "media" && /spotify|music\.apple|soundcloud/i.test(reading.url)
            ? "music"
            : undefined;
    const existing = sectionsOf(start.blocks).find((section) => {
        if (section.definition.key !== key) return false;
        if (styleId && section.style.id !== styleId) return false;
        // Video goes in a video section, and a second song or booking link gets its own.
        if (key === "media" && !styleId) return section.style.type === "video";
        const block = section.blocks[0];
        return !(block && !isList(block) && "url" in block && block.url);
    });
    let page = start;
    let id = existing?.id;
    if (!id) {
        const blocks = makeSection(definition, makeId, styleId);
        const spot = place(start, blocks);
        page = addSection(start, blocks, spot.at, spot.list);
        id = blocks[0]?.section;
    }
    const found = id ? findSection(page, id) : null;
    if (!id || !found) return null;
    const first = found.section.blocks[0];
    const title = reading.title;
    if (key === "links") {
        const blank = found.section.blocks.find(
            (block) => (block.type === "button" || block.type === "link-card") && !block.url,
        );
        if (blank) {
            page = setBlockField(page, blank.id, "url", reading.url);
            page = setBlockField(page, blank.id, blank.type === "button" ? "text" : "title", title);
        } else {
            page = addLinkToSection(page, id, makeId, reading.url, title);
        }
    } else if (first?.type === "contact") {
        const known = first.items.find((entry) => !entry.value && entry.type === reading.icon);
        const blank = known ?? first.items.find((entry) => !entry.value);
        const items = blank
            ? first.items.map((entry) =>
                  entry.id === blank.id
                      ? { ...entry, value: reading.url, type: reading.icon }
                      : entry,
              )
            : [...first.items, { id: makeId(), type: reading.icon, value: reading.url }];
        page = setBlockField(page, first.id, "items", items);
    } else if (first?.type === "video") {
        const blank = first.items.find((entry) => !entry.url);
        const items = blank
            ? first.items.map((entry) =>
                  entry.id === blank.id
                      ? { ...entry, url: reading.url, ...(existing ? {} : { title }) }
                      : entry,
              )
            : [...first.items, { id: makeId(), title: title || "New video", url: reading.url }];
        page = setBlockField(page, first.id, "items", items);
    } else if (first) {
        page = setBlockField(page, first.id, "url", reading.url);
        // A section made just now holds sample words, so the link names it.
        if (!existing && "title" in first) page = setBlockField(page, first.id, "title", title);
    }
    return { page, section: id, name: definition.name, made: !existing };
}
