import { findBlock } from "@tondo/page";
import { fontsHref, looks, paint } from "@tondo/render";
import { createEffect, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import type { Account } from "../lib/account";
import { createEditor, HEADER } from "../state/document";
import { BlockActions } from "./BlockActions";
import { Canvas } from "./Canvas";
import { Icon } from "./Icon";
import { Inspector } from "./Inspector";
import { Looks } from "./Looks";
import { Preview } from "./Preview";
import { Shelf } from "./Shelf";
import { TopBar } from "./TopBar";

type Sheet = "add" | "look" | null;

/** How far the sheet's grip has to move to count as a drag and not a tap. */
const GRIP_DRAG = 24;

export function Editor(props: { account: Account }) {
    const editor = createEditor(untrack(() => props.account));
    const [frame, setFrame] = createSignal<HTMLIFrameElement>();
    const [layoutTick, setLayoutTick] = createSignal(0);
    const [sheet, setSheet] = createSignal<Sheet>(null);
    const [size, setSize] = createSignal<"half" | "full">("half");
    const [previewing, setPreviewing] = createSignal(false);

    // Fonts for the page live in its iframe, and thumbnails need them out here too.
    createEffect(() => {
        const href = fontsHref(editor.page());
        const id = "look-fonts";
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            document.head.append(link);
        }
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    });

    const onGripDown = (e: PointerEvent) => {
        const startY = e.clientY;
        const onUp = (up: PointerEvent) => {
            const moved = up.clientY - startY;
            if (Math.abs(moved) < GRIP_DRAG) return;
            if (moved < 0) setSize("full");
            else if (size() === "full") setSize("half");
            else {
                setSheet(null);
                editor.select(null);
            }
        };
        window.addEventListener("pointerup", onUp, { once: true });
    };

    // The palette is limited to hex colours by the page schema, so this markup is safe to insert.
    const [backdrop, setBackdrop] = createSignal<HTMLDivElement>();
    createEffect(() => {
        const page = editor.page();
        const look = looks[page.look];
        const element = backdrop();
        if (element)
            element.innerHTML = paint(page.paint ?? look.palette, (page.seed ?? look.seed) + 1, {
                ring: look.ring,
            });
    });

    const onKey = (e: KeyboardEvent) => {
        const target = e.target;
        const typing =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            (target instanceof HTMLElement && target.isContentEditable);
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
            e.preventDefault();
            if (e.shiftKey) editor.redo();
            else editor.undo();
            return;
        }
        if (e.key === "Escape") {
            setPreviewing(false);
            if (target instanceof HTMLElement) target.blur();
            editor.select(null);
            return;
        }
        if (typing) return;
        const id = editor.selected();
        if (id && id !== HEADER && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
            e.preventDefault();
            editor.duplicate(id);
            return;
        }
        if (id && id !== HEADER && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const index = findBlock(editor.page(), id)?.index ?? 0;
            editor.move(id, index + (e.key === "ArrowUp" ? -1 : 1));
            return;
        }
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
        if (editor.selected()) {
            setSheet(null);
            setSize("half");
        }
    });

    return (
        <div
            class="editor"
            data-sheet={sheet() ?? (editor.selected() ? "edit" : undefined)}
            data-size={size()}
        >
            <div class="backdrop" aria-hidden="true" ref={setBackdrop} />
            <TopBar editor={editor} account={props.account} onPreview={() => setPreviewing(true)} />
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
                    type="button"
                    class="sheet-grip"
                    aria-label={
                        size() === "half" ? "Make the panel taller" : "Make the panel shorter"
                    }
                    onClick={() => setSize((was) => (was === "half" ? "full" : "half"))}
                    onPointerDown={onGripDown}
                />
                <Show
                    when={editor.selected()}
                    keyed
                    fallback={
                        <div class="side-body">
                            <Looks editor={editor} />
                        </div>
                    }
                >
                    <Inspector
                        editor={editor}
                        onClose={() => editor.select(null)}
                        onAdd={() => setSheet("add")}
                    />
                </Show>
            </aside>
            <nav class="tabs" aria-label="Editor">
                <button class="pill" onClick={() => setSheet("add")}>
                    Add
                </button>
                <button class="pill" onClick={() => setSheet("look")}>
                    Look
                </button>
                <button class="pill" onClick={() => setPreviewing(true)}>
                    Preview
                </button>
            </nav>
            <Show when={previewing()}>
                <Preview page={editor.page()} onClose={() => setPreviewing(false)} />
            </Show>
        </div>
    );
}
