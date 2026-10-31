import { blockDefinitions, blockSchemaUnion, pageSchema, starterPage } from "@tondo/page";
import type { Block, BlockType, Header, LookName, Page } from "@tondo/page";
import { createSignal } from "solid-js";
import { createHistory } from "./history";
import { loadDraft, saveDraft } from "./storage";

export const HEADER = "header";

export function newBlock(type: BlockType, id: string): Block {
    return blockSchemaUnion.parse({ id, ...blockDefinitions[type].make() });
}

export function addBlock(page: Page, block: Block, at: number): Page {
    const blocks = [...page.blocks];
    blocks.splice(at, 0, block);
    return { ...page, blocks };
}

export function moveBlock(page: Page, id: string, to: number): Page {
    const from = page.blocks.findIndex((block) => block.id === id);
    const block = page.blocks[from];
    if (!block || to < 0 || to >= page.blocks.length || to === from) return page;
    const blocks = page.blocks.filter((other) => other.id !== id);
    blocks.splice(to, 0, block);
    return { ...page, blocks };
}

export function removeBlock(page: Page, id: string): Page {
    return { ...page, blocks: page.blocks.filter((block) => block.id !== id) };
}

/** Returns the page unchanged if the value isn't allowed, such as text over a block's limit. */
export function setBlockField(page: Page, id: string, key: string, value: unknown): Page {
    const blocks = page.blocks.map((block) => {
        if (block.id !== id) return block;
        const parsed = blockSchemaUnion.safeParse({ ...block, [key]: value });
        return parsed.success ? parsed.data : block;
    });
    return { ...page, blocks };
}

export function setHeaderField(page: Page, key: string, value: unknown): Page {
    const parsed = pageSchema.safeParse({ ...page, header: { ...page.header, [key]: value } });
    return parsed.success ? parsed.data : page;
}

export type EditorState = ReturnType<typeof createEditor>;

export function createEditor(account: { handle: string; name: string }) {
    const history = createHistory<Page>();
    const [page, setPage] = createSignal<Page>(
        loadDraft(account.handle) ?? starterPage(account.name),
    );
    const [selected, setSelected] = createSignal<string | null>(null);
    const [saved, setSaved] = createSignal(true);
    const [version, setVersion] = createSignal(0);

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
        if (id && id !== HEADER && !next.blocks.some((block) => block.id === id)) setSelected(null);
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
            setSelected(block.id);
        },
        move(id: string, to: number) {
            change(moveBlock(page(), id, to));
        },
        duplicate(id: string) {
            const current = page();
            const index = current.blocks.findIndex((block) => block.id === id);
            const block = current.blocks[index];
            if (!block) return;
            const copy = { ...block, id: crypto.randomUUID() };
            change(addBlock(current, copy, index + 1));
            setSelected(copy.id);
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

export function getField(page: Page, target: string, key: string): unknown {
    const owner: Header | Block | undefined =
        target === HEADER ? page.header : page.blocks.find((block) => block.id === target);
    return owner ? Object.entries(owner).find(([name]) => name === key)?.[1] : undefined;
}
