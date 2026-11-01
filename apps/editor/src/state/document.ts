import {
    addLinkToSection,
    addSection,
    duplicateSection,
    findBlock,
    findSection,
    getField,
    HEADER,
    makeSection,
    moveBlock,
    moveSection,
    readLink,
    removeBlock,
    removeSection,
    routeLink,
    sectionDefinition,
    sectionsOf,
    setBlockField,
    setHeaderField,
    setSectionBigTitle,
    setSectionShared,
    setSectionStyle,
    setSectionTitle,
} from "@tondo/page";
import type { Block, LookName, Page, PageStyle, Place } from "@tondo/page";
import { createSignal } from "solid-js";
import { createHistory } from "./history";
import { createSaver } from "./saver";
import { loadBackup } from "./storage";

export { getField, HEADER };

export type EditorState = ReturnType<typeof createEditor>;

interface Start {
    handle: string;
    page: Page;
    updatedAt: string;
    changed: boolean;
    onLoggedOut: () => void;
}

const makeId = () => crypto.randomUUID();

export function createEditor(start: Start) {
    const saver = createSaver(start);
    const backup = loadBackup(start.handle, start.updatedAt);
    const history = createHistory<Page>();
    const [page, setPage] = createSignal<Page>(backup ?? start.page);
    const [changed, setChanged] = createSignal(start.changed || backup !== null);
    const [selected, setSelected] = createSignal<string | null>(null);
    const [version, setVersion] = createSignal(0);
    const [chosenTabs, setChosenTabs] = createSignal<Readonly<Record<string, string>>>({});
    const [notice, setNotice] = createSignal("");
    // What a section last held in another style, so trying a style and coming back loses nothing.
    const earlier = new Map<string, Block[]>();
    let justAdded = false;

    const apply = (next: Page) => {
        setPage(next);
        setChanged(true);
        saver.change(next);
        setVersion((v) => v + 1);
    };
    const change = (next: Page, group?: string) => {
        const before = page();
        if (next === before) return;
        history.record(before, group);
        apply(next);
    };
    const clearMissingSelection = (next: Page) => {
        const id = selected();
        if (id && id !== HEADER && !findSection(next, id)) setSelected(null);
    };
    const travel = (step: (current: Page) => Page | null) => {
        const next = step(page());
        if (!next) return;
        clearMissingSelection(next);
        apply(next);
    };
    const say = (message: string) => {
        setNotice(message);
    };

    // A new section goes below the selected one, in the same list, or into the shown tab.
    const where = (hasTabs: boolean): { at: number; list?: Place } => {
        const current = page();
        const id = selected();
        if (id === HEADER) return { at: 0 };
        const found = id ? findSection(current, id) : null;
        if (!found) return { at: sectionsOf(current.blocks).length };
        const first = found.section.blocks[0];
        if (first?.type === "tabs" && !hasTabs) {
            const tab =
                first.tabs.find((other) => other.id === chosenTabs()[first.id]) ?? first.tabs[0];
            if (tab) {
                return {
                    at: sectionsOf(tab.blocks).length,
                    list: { tabs: first.id, tab: tab.id },
                };
            }
        }
        if (found.place && hasTabs) {
            const top = findSection(current, found.place.tabs);
            return { at: (top?.index ?? 0) + 1 };
        }
        return { at: found.index + 1, ...(found.place ? { list: found.place } : {}) };
    };

    const placeSection = (key: string, at?: number, styleId?: string): string | null => {
        const definition = sectionDefinition(key);
        if (!definition) return null;
        const blocks = makeSection(definition, makeId, styleId);
        const hasTabs = blocks.some((block) => block.type === "tabs");
        const spot = at === undefined ? where(hasTabs) : { at };
        change(addSection(page(), blocks, spot.at, spot.list));
        const id = blocks[0]?.section ?? null;
        justAdded = true;
        setSelected(id);
        return id;
    };

    if (backup) saver.change(backup);

    return {
        page,
        selected,
        saver,
        changed,
        notice,
        clearNotice() {
            setNotice("");
        },
        markPublished() {
            setChanged(false);
        },
        select: setSelected,
        /** True once after a section is added, so the panel can focus its first field. */
        takeJustAdded() {
            const was = justAdded;
            justAdded = false;
            return was;
        },
        canUndo: () => {
            version();
            return history.canUndo();
        },
        canRedo: () => {
            version();
            return history.canRedo();
        },
        undo: () => {
            travel((current) => history.undo(current));
        },
        redo: () => {
            travel((current) => history.redo(current));
        },
        /** The tab to show: the one holding the selected section, or the last one chosen. */
        shownTab(block: Extract<Block, { type: "tabs" }>) {
            const inside = findSection(page(), selected() ?? "")?.place;
            if (inside?.tabs === block.id) return inside.tab;
            const chosen = chosenTabs()[block.id];
            return block.tabs.some((tab) => tab.id === chosen) ? chosen : block.tabs[0]?.id;
        },
        showTab(id: string, position: number) {
            const found = findBlock(page(), id)?.block;
            const tab = found?.type === "tabs" ? found.tabs[position] : undefined;
            if (tab) setChosenTabs((was) => ({ ...was, [id]: tab.id }));
        },
        addSection: placeSection,
        /** Puts a pasted link where it belongs. False if it isn't a usable link. */
        addFromLink(raw: string) {
            const reading = readLink(raw);
            if (reading.state !== "ok") return false;
            const { key } = routeLink(reading.url);
            const definition = sectionDefinition(key);
            if (!definition) return false;
            const styleId =
                key === "media" && /spotify|music\.apple|soundcloud/i.test(reading.url)
                    ? "music"
                    : undefined;
            const existing = sectionsOf(page().blocks).find(
                (section) =>
                    section.definition.key === key && (!styleId || section.style.id === styleId),
            );
            const id = existing?.id ?? placeSection(key, undefined, styleId);
            if (!id) return false;
            const found = findSection(page(), id);
            if (!found) return false;
            const first = found.section.blocks[0];
            const title = reading.title || reading.label;
            if (key === "links") {
                const blank = found.section.blocks.find(
                    (block) =>
                        (block.type === "button" || block.type === "link-card") && !block.url,
                );
                if (blank) {
                    let next = setBlockField(page(), blank.id, "url", reading.url);
                    next = setBlockField(
                        next,
                        blank.id,
                        blank.type === "button" ? "text" : "title",
                        title,
                    );
                    change(next);
                } else {
                    change(addLinkToSection(page(), id, makeId, reading.url, title));
                }
            } else if (first?.type === "contact") {
                const known = first.items.find(
                    (entry) => !entry.value && entry.type === reading.icon,
                );
                const blank = known ?? first.items.find((entry) => !entry.value);
                const items = blank
                    ? first.items.map((entry) =>
                          entry.id === blank.id
                              ? { ...entry, value: reading.url, type: reading.icon }
                              : entry,
                      )
                    : [...first.items, { id: makeId(), type: reading.icon, value: reading.url }];
                change(setBlockField(page(), first.id, "items", items));
            } else if (first?.type === "video") {
                const blank = first.items.find((entry) => !entry.url);
                const items = blank
                    ? first.items.map((entry) =>
                          entry.id === blank.id ? { ...entry, url: reading.url } : entry,
                      )
                    : [
                          ...first.items,
                          { id: makeId(), title: title || "New video", url: reading.url },
                      ];
                change(setBlockField(page(), first.id, "items", items));
            } else if (first) {
                change(setBlockField(page(), first.id, "url", reading.url));
            }
            setSelected(id);
            say(`Added to ${definition.name}`);
            return true;
        },
        moveSection(id: string, to: number) {
            change(moveSection(page(), id, to));
            setSelected(id);
        },
        duplicate(id: string) {
            const [next, copy] = duplicateSection(page(), id, makeId);
            change(next);
            if (copy) setSelected(copy);
        },
        remove(id: string) {
            const name = findSection(page(), id)?.section.definition.name;
            change(removeSection(page(), id));
            setSelected(null);
            if (name) say(`Removed ${name}. Undo brings it back.`);
        },
        setSectionStyle(id: string, styleId: string) {
            const found = findSection(page(), id);
            const style = found?.section.definition.styles.find((other) => other.id === styleId);
            if (!found || !style) return;
            const key = (type: string) => `${found.section.id}:${type}`;
            const was = found.section.blocks[0];
            if (was) earlier.set(key(was.type), found.section.blocks);
            change(setSectionStyle(page(), id, styleId, makeId, earlier.get(key(style.type))));
        },
        setSectionTitle(id: string, text: string) {
            change(setSectionTitle(page(), id, text, makeId), `${id}:title`);
        },
        setBigTitle(id: string, big: boolean) {
            change(setSectionBigTitle(page(), id, big));
        },
        setShared(id: string, key: "hidden" | "showFrom" | "showUntil" | "tint", value: unknown) {
            change(setSectionShared(page(), id, key, value), `${id}:${key}`);
        },
        addLink(id: string) {
            change(addLinkToSection(page(), id, makeId));
        },
        moveLink(blockId: string, by: number) {
            const found = findBlock(page(), blockId);
            if (found) change(moveBlock(page(), blockId, found.index + by));
        },
        removeLink(sectionId: string, blockId: string) {
            const found = findSection(page(), sectionId);
            if (found && found.section.blocks.length <= 1) {
                change(removeSection(page(), sectionId));
                setSelected(null);
            } else {
                change(removeBlock(page(), blockId));
            }
        },
        setField(target: string, key: string, value: unknown, group?: string) {
            const current = page();
            const next =
                target === HEADER
                    ? setHeaderField(current, key, value)
                    : setBlockField(current, target, key, value);
            change(next, group ?? `${target}:${key}`);
            return next !== current || value === getField(current, target, key);
        },
        setPageText(key: "title" | "description", value: string) {
            const { [key]: _old, ...rest } = page();
            change(value ? { ...rest, [key]: value } : rest, `page:${key}`);
        },
        /** A person's own colour stays with them. Everything else belongs to the new look. */
        setLook(look: LookName) {
            const { paint: _paint, seed: _seed, style, ...rest } = page();
            const colour = style?.colour;
            const kept = colour && (colour.mode === "brand" || colour.mode === "photo");
            const hadStyle = style && Object.keys(style).length > 0;
            change(kept ? { ...rest, look, style: { colour } } : { ...rest, look });
            if (hadStyle) say(kept ? "Changed the look and kept your colour" : "Changed the look");
        },
        setStyle(patch: Partial<PageStyle>, group?: string) {
            const { style, ...rest } = page();
            const merged = { ...style, ...patch };
            const clean = Object.fromEntries(
                Object.entries(merged).filter(([, value]) => value !== undefined),
            ) as PageStyle;
            change(Object.keys(clean).length ? { ...rest, style: clean } : rest, group);
        },
        resetStyle() {
            const { style: _style, seed: _seed, ...rest } = page();
            change(rest);
        },
        repaint() {
            change({ ...page(), seed: 1 + Math.floor(Math.random() * 998) });
        },
    };
}
