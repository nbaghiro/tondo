import {
    addBlock,
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
import type { BlockType, LookName, Page } from "@tondo/page";
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
        add(type: BlockType, at?: number) {
            const block = newBlock(type, crypto.randomUUID());
            const current = page();
            const after = current.blocks.findIndex((other) => other.id === selected());
            const index = at ?? (after >= 0 ? after + 1 : current.blocks.length);
            change(addBlock(current, block, index));
            justAdded = true;
            setSelected(block.id);
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
            change({ ...page(), look });
        },
        repaint() {
            change({ ...page(), seed: 1 + Math.floor(Math.random() * 998) });
        },
    };
}
