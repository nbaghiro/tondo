import {
    addFromLink,
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
    pageHash,
    removeBlock,
    removeSection,
    resetStyle,
    sectionDefinition,
    sectionsOf,
    setBlockField,
    setHeaderField,
    setLook,
    setPageText,
    setPaint,
    setSeed,
    setStyle,
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
    pageId: string;
    page: Page;
    updatedAt: string;
    changed: boolean;
    published?: boolean;
    onLoggedOut: () => void;
}

const makeId = () => crypto.randomUUID();

export function createEditor(start: Start) {
    const saver = createSaver(start);
    const backup = loadBackup(start.pageId, start.updatedAt);
    const history = createHistory<Page>();
    const [page, setPage] = createSignal<Page>(backup ?? start.page);
    const [changed, setChanged] = createSignal(start.changed || backup !== null);
    const [hasLive, setHasLive] = createSignal(start.published === true);
    const [selected, setSelected] = createSignal<string | null>(null);
    const [version, setVersion] = createSignal(0);
    const [chosenTabs, setChosenTabs] = createSignal<Readonly<Record<string, string>>>({});
    const [notice, setNotice] = createSignal("");
    // A Help me turn's working copy. While it's set the page is on show but can't be edited.
    const [turn, setTurn] = createSignal<Page | null>(null);
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
        if (turn()) return;
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
        if (turn()) return;
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
        page: () => turn() ?? page(),
        /** Locks the page for a Help me turn. */
        beginTurn() {
            setTurn(page());
        },
        locked: () => turn() !== null,
        showTurn: setTurn,
        /** One turn is one undo step. Returns the page it left, or null if nothing changed. */
        endTurn(next: Page | null) {
            setTurn(null);
            if (!next || pageHash(next) === pageHash(page())) return null;
            change(next);
            clearMissingSelection(next);
            return next;
        },
        /** The person's tap on a card in Help me. */
        commitPage(next: Page) {
            change(next);
            clearMissingSelection(next);
        },
        selected,
        saver,
        changed,
        notice,
        clearNotice() {
            setNotice("");
        },
        hasLive,
        markPublished() {
            setHasLive(true);
            setChanged(false);
        },
        /** What's live may have changed elsewhere, such as taking the page down in another tab. */
        syncLive(published: boolean, draftChanged: boolean) {
            setHasLive(published);
            setChanged(!published || draftChanged);
        },
        /** Goes back to what's live. It saves like any edit, so Undo and the conflict check still work. */
        discardTo(live: Page) {
            setSelected(null);
            change(live);
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
            const added = addFromLink(page(), raw, makeId, (_current, blocks) =>
                where(blocks.some((block) => block.type === "tabs")),
            );
            if (!added) return false;
            change(added.page);
            if (added.made) justAdded = true;
            setSelected(added.section);
            say(`Added to ${added.name}`);
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
            change(setPageText(page(), key, value), `page:${key}`);
        },
        setLook(look: LookName) {
            const { style } = page();
            const next = setLook(page(), look);
            change(next);
            if (style && Object.keys(style).length > 0) {
                say(next.style ? "Changed the look and kept your colour" : "Changed the look");
            }
        },
        setStyle(patch: Partial<PageStyle>, group?: string) {
            change(setStyle(page(), patch), group);
        },
        resetStyle() {
            change(resetStyle(page()));
        },
        setPaint(paint: string[] | undefined) {
            change(setPaint(page(), paint));
        },
        repaint() {
            change(setSeed(page(), 1 + Math.floor(Math.random() * 998)));
        },
    };
}
