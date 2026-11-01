import {
    addBlock,
    blockFromLink,
    duplicateBlock,
    findBlock,
    getField,
    HEADER,
    moveBlock,
    newBlock,
    removeBlock,
    setBlockField,
    setHeaderField,
    starterPage,
} from "@tondo/page";
import type { Block, BlockType, LookName, Page, Place } from "@tondo/page";
import { createSignal } from "solid-js";
import { createHistory } from "./history";
import { loadDraft, saveDraft } from "./storage";

export { getField, HEADER };

export type EditorState = ReturnType<typeof createEditor>;

export function createEditor(account: { handle: string; name: string }) {
    const history = createHistory<Page>();
    const [page, setPage] = createSignal<Page>(
        loadDraft(account.handle) ?? starterPage(account.name),
    );
    const [selected, setSelected] = createSignal<string | null>(null);
    const [saved, setSaved] = createSignal(true);
    const [version, setVersion] = createSignal(0);
    const [chosenTabs, setChosenTabs] = createSignal<Readonly<Record<string, string>>>({});
    let justAdded = false;

    const apply = (next: Page) => {
        setPage(next);
        setSaved(saveDraft(account.handle, next));
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
        if (id && id !== HEADER && !findBlock(next, id)) setSelected(null);
    };
    const travel = (step: (current: Page) => Page | null) => {
        const next = step(page());
        if (!next) return;
        clearMissingSelection(next);
        apply(next);
    };

    // A new block goes below the selected one, in the same list, or into the shown tab.
    const where = (type: BlockType): { at: number; list?: Place } => {
        const current = page();
        const found = findBlock(current, selected() ?? "");
        if (!found) return { at: current.blocks.length };
        if (found.block.type === "tabs" && type !== "tabs") {
            const tab =
                found.block.tabs.find((other) => other.id === chosenTabs()[found.block.id]) ??
                found.block.tabs[0];
            if (tab) return { at: tab.blocks.length, list: { tabs: found.block.id, tab: tab.id } };
        }
        if (found.place && type === "tabs") {
            const tabs = found.place.tabs;
            return { at: current.blocks.findIndex((block) => block.id === tabs) + 1 };
        }
        return { at: found.index + 1, ...(found.place ? { list: found.place } : {}) };
    };
    const place = (block: Block, at?: number) => {
        const spot = at === undefined ? where(block.type) : { at };
        change(addBlock(page(), block, spot.at, spot.list));
        justAdded = true;
        setSelected(block.id);
    };

    return {
        page,
        selected,
        saved,
        select: setSelected,
        /** True once after a block is added, so the panel can focus its first field. */
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
        /** The tab to show: the one holding the selected block, or the last one chosen. */
        shownTab(block: Extract<Block, { type: "tabs" }>) {
            const inside = findBlock(page(), selected() ?? "")?.place;
            if (inside?.tabs === block.id) return inside.tab;
            const chosen = chosenTabs()[block.id];
            return block.tabs.some((tab) => tab.id === chosen) ? chosen : block.tabs[0]?.id;
        },
        showTab(id: string, position: number) {
            const found = findBlock(page(), id)?.block;
            const tab = found?.type === "tabs" ? found.tabs[position] : undefined;
            if (tab) setChosenTabs((was) => ({ ...was, [id]: tab.id }));
        },
        add(type: BlockType, at?: number) {
            place(newBlock(type, crypto.randomUUID()), at);
        },
        /** Adds whichever block suits a pasted link. False if it isn't a usable link. */
        addFromLink(raw: string) {
            const block = blockFromLink(raw, crypto.randomUUID());
            if (!block) return false;
            place(block);
            return true;
        },
        move(id: string, to: number) {
            change(moveBlock(page(), id, to));
        },
        duplicate(id: string) {
            const [next, copy] = duplicateBlock(page(), id, () => crypto.randomUUID());
            change(next);
            if (copy) setSelected(copy);
        },
        remove(id: string) {
            change(removeBlock(page(), id));
            setSelected(null);
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
        setLook(look: LookName) {
            const { paint: _paint, seed: _seed, ...rest } = page();
            change({ ...rest, look });
        },
        setPaint(palette: readonly string[] | undefined) {
            const { paint: _paint, ...rest } = page();
            change(palette ? { ...rest, paint: [...palette] } : rest);
        },
        repaint() {
            change({ ...page(), seed: 1 + Math.floor(Math.random() * 998) });
        },
    };
}
