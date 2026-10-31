import { looks, paint } from "@tondo/render";
import { createEffect, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import type { Account } from "../lib/account";
import { createEditor, HEADER } from "../state/document";
import { BlockActions } from "./BlockActions";
import { Canvas } from "./Canvas";
import { Icon } from "./Icon";
import { Inspector } from "./Inspector";
import { Looks } from "./Looks";
import { Shelf } from "./Shelf";
import { TopBar } from "./TopBar";

type Sheet = "add" | "look" | null;

export function Editor(props: { account: Account }) {
    const editor = createEditor(untrack(() => props.account));
    const [frame, setFrame] = createSignal<HTMLIFrameElement>();
    const [layoutTick, setLayoutTick] = createSignal(0);
    const [sheet, setSheet] = createSignal<Sheet>(null);

    // The palette is limited to hex colours by the page schema, so this markup is safe to insert.
    const [backdrop, setBackdrop] = createSignal<HTMLDivElement>();
    createEffect(() => {
        const page = editor.page();
        const look = looks[page.look];
        const element = backdrop();
        if (element)
            element.innerHTML = paint(page.paint ?? look.palette, (page.seed ?? look.seed) + 1);
    });

    const onKey = (e: KeyboardEvent) => {
        const target = e.target;
        const typing =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
            e.preventDefault();
            if (e.shiftKey) editor.redo();
            else editor.undo();
            return;
        }
        if (typing) return;
        const id = editor.selected();
        if (e.key === "Escape") editor.select(null);
        if (id && id !== HEADER && (e.key === "Backspace" || e.key === "Delete")) {
            e.preventDefault();
            editor.remove(id);
        }
    };

    onMount(() => {
        window.addEventListener("keydown", onKey);
        const relayout = () => setLayoutTick((tick) => tick + 1);
        window.addEventListener("resize", relayout);
        onCleanup(() => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", relayout);
        });
    });

    createEffect(() => {
        if (editor.selected()) setSheet(null);
    });

    return (
        <div class="editor" data-sheet={sheet() ?? (editor.selected() ? "edit" : undefined)}>
            <div class="backdrop" aria-hidden="true" ref={setBackdrop} />
            <TopBar editor={editor} account={props.account} />
            <aside class="panel shelf" aria-label="Add to your page">
                <button class="round sheet-close" aria-label="Close" onClick={() => setSheet(null)}>
                    <Icon name="close" />
                </button>
                <Shelf editor={editor} frame={frame} onAdded={() => setSheet(null)} />
            </aside>
            <main class="stage">
                <div class="frame">
                    <Canvas
                        editor={editor}
                        ref={setFrame}
                        onLayout={() => setLayoutTick((tick) => tick + 1)}
                        onKey={onKey}
                    />
                </div>
            </main>
            <BlockActions editor={editor} frame={frame} layoutTick={layoutTick} />
            <aside class="panel side" aria-label="Look and settings">
                <button
                    class="round sheet-close"
                    aria-label="Close"
                    onClick={() => {
                        setSheet(null);
                        editor.select(null);
                    }}
                >
                    <Icon name="close" />
                </button>
                <Show when={editor.selected()} fallback={<Looks editor={editor} />}>
                    <Inspector editor={editor} onClose={() => editor.select(null)} />
                </Show>
            </aside>
            <nav class="tabs" aria-label="Editor">
                <button class="pill" onClick={() => setSheet("add")}>
                    Add
                </button>
                <button class="pill" onClick={() => setSheet("look")}>
                    Look
                </button>
            </nav>
        </div>
    );
}
