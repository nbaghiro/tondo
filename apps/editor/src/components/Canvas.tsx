import type { Page } from "@tondo/page";
import { fontsHref, renderBlock, renderCss, renderDocument, renderHeader } from "@tondo/render";
import { createEffect, createSignal, onCleanup, untrack } from "solid-js";
import { startDrag } from "../lib/drag";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import canvasCss from "../styles/canvas.css?inline";

const CTX = { assetBase: import.meta.env.BASE_URL, editable: true };
const EMPTY = `<div class="t-empty"><b>Your page is empty</b><span>Choose a block to start.</span></div>`;

interface CanvasProps {
    editor: EditorState;
    ref: (frame: HTMLIFrameElement) => void;
    /** Called when the page scrolls or changes, so anything positioned over it can follow. */
    onLayout: () => void;
    onKey: (event: KeyboardEvent) => void;
}

const motionOk = (win: Window) => !win.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Canvas(props: CanvasProps) {
    let frame: HTMLIFrameElement | undefined;
    const [doc, setDoc] = createSignal<Document | null>(null);
    const drawn = new Map<string, string>();
    let drawnHeader = "";
    let editing: string | null = null;

    const srcdoc = untrack(() =>
        renderDocument(props.editor.page(), { ...CTX, title: "Preview", editorCss: canvasCss }),
    );

    function syncLook(d: Document, page: Page) {
        const styles = d.getElementById("t-styles");
        const css = renderCss(page);
        if (styles && styles.textContent !== css) styles.textContent = css;
        const fonts = d.getElementById("t-fonts");
        const href = fontsHref(page);
        if (fonts && fonts.getAttribute("href") !== href) fonts.setAttribute("href", href);
        d.documentElement.className = `look ${page.look}`;
    }

    function syncHeader(d: Document, page: Page) {
        const html = renderHeader(page, CTX);
        const node = d.getElementById("t-header");
        if (html !== drawnHeader && editing !== HEADER && node) {
            node.innerHTML = html;
            drawnHeader = html;
        }
    }

    function makeNode(d: Document, html: string): Element | null {
        const holder = d.createElement("template");
        holder.innerHTML = html;
        return holder.content.firstElementChild;
    }

    function syncBlocks(d: Document, page: Page) {
        const list = d.getElementById("t-blocks");
        if (!list) return;
        const before = new Map(
            [...list.children].map((node) => [
                node.getAttribute("data-block-id") ?? "",
                node.getBoundingClientRect().top,
            ]),
        );
        const orderBefore = [...before.keys()].filter((id) => page.blocks.some((b) => b.id === id));
        const wanted = new Set(page.blocks.map((block) => block.id));

        for (const node of [...list.children]) {
            const id = node.getAttribute("data-block-id");
            if (!id || !wanted.has(id)) {
                node.remove();
                if (id) drawn.delete(id);
            }
        }
        const added: Element[] = [];
        page.blocks.forEach((block, position) => {
            const html = renderBlock(block, CTX);
            let node = list.querySelector(`:scope > [data-block-id="${CSS.escape(block.id)}"]`);
            if (!node) {
                node = makeNode(d, html);
                if (!node) return;
                added.push(node);
                drawn.set(block.id, html);
            } else if (drawn.get(block.id) !== html && editing !== block.id) {
                const fresh = makeNode(d, html);
                if (fresh) {
                    node.replaceWith(fresh);
                    node = fresh;
                }
                drawn.set(block.id, html);
            }
            if (list.children[position] !== node)
                list.insertBefore(node, list.children[position] ?? null);
        });
        if (!page.blocks.length) list.innerHTML = EMPTY;

        const win = d.defaultView;
        if (!win || !motionOk(win)) return;
        const orderAfter = page.blocks.map((b) => b.id).filter((id) => before.has(id));
        if (orderBefore.join() !== orderAfter.join()) {
            for (const node of list.children) {
                const was = before.get(node.getAttribute("data-block-id") ?? "");
                if (was === undefined) continue;
                const distance = was - node.getBoundingClientRect().top;
                if (distance) {
                    node.animate(
                        [{ transform: `translateY(${distance}px)` }, { transform: "none" }],
                        { duration: 280, easing: "cubic-bezier(.2,.85,.25,1)" },
                    );
                }
            }
        }
        for (const node of added) node.classList.add("t-fresh");
    }

    function syncSelection(d: Document, selected: string | null) {
        for (const node of d.querySelectorAll(".t-selected")) node.classList.remove("t-selected");
        if (!selected) return;
        const node =
            selected === HEADER
                ? d.getElementById("t-header")
                : d.querySelector(`[data-block-id="${CSS.escape(selected)}"]`);
        node?.classList.add("t-selected");
    }

    // Changing the look or its painting opens up from the middle, like paint spreading.
    let drawnLook = "";
    const lookKey = (page: Page) =>
        [page.look, page.seed ?? "", page.paint?.join() ?? ""].join("|");

    function sync(d: Document) {
        const page = props.editor.page();
        const apply = () => {
            syncLook(d, page);
            syncHeader(d, page);
        };
        const key = lookKey(page);
        const reveal =
            drawnLook !== "" &&
            drawnLook !== key &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches;
        drawnLook = key;
        if (reveal && "startViewTransition" in d) d.startViewTransition(apply);
        else apply();
        syncBlocks(d, page);
        syncSelection(d, props.editor.selected());
        props.onLayout();
    }

    function startInline(el: HTMLElement, target: string, d: Document) {
        const key = el.dataset["field"];
        const win = d.defaultView;
        if (!key || !win) return;
        editing = target;
        el.contentEditable = "plaintext-only";
        el.focus();
        const range = d.createRange();
        range.selectNodeContents(el);
        const selection = win.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        const onInput = () => {
            props.editor.setField(target, key, el.textContent);
            props.onLayout();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                el.blur();
            }
        };
        el.addEventListener("input", onInput);
        el.addEventListener("keydown", onKeyDown);
        el.addEventListener(
            "blur",
            () => {
                el.removeEventListener("input", onInput);
                el.removeEventListener("keydown", onKeyDown);
                el.removeAttribute("contenteditable");
                editing = null;
                // Whatever was refused while typing, such as text over a limit, gets redrawn here.
                drawn.delete(target);
                drawnHeader = target === HEADER ? "" : drawnHeader;
                sync(d);
            },
            { once: true },
        );
    }

    function attach(d: Document) {
        const win = d.defaultView;
        if (!win) return;
        const element = (target: EventTarget | null) =>
            target instanceof win.Element ? target : null;

        d.addEventListener("click", (e) => {
            e.preventDefault();
            const target = element(e.target);
            if (target?.closest("[contenteditable]")) return;
            const owner = target?.closest("[data-block-id], #t-header");
            if (!owner) {
                props.editor.select(null);
                return;
            }
            const id = owner.getAttribute("data-block-id") ?? HEADER;
            const field = target?.closest("[data-field]");
            const touch = win.matchMedia("(pointer: coarse)").matches;
            if (id === props.editor.selected() && field instanceof win.HTMLElement && !touch) {
                startInline(field, id, d);
            } else {
                props.editor.select(id);
            }
        });
        d.addEventListener("submit", (e) => {
            e.preventDefault();
        });
        d.addEventListener("pointerdown", (e) => {
            const target = element(e.target);
            if (e.pointerType !== "mouse" || e.button !== 0 || target?.closest("[contenteditable]"))
                return;
            const owner = target?.closest("[data-block-id]");
            const id = owner?.getAttribute("data-block-id");
            if (!id || !frame) return;
            const moving = () => d.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
            startDrag({
                event: e,
                source: d.documentElement,
                frame,
                fromFrame: true,
                label: "Move block",
                onStart: () => moving()?.classList.add("t-dragging"),
                onEnd: (index) => {
                    moving()?.classList.remove("t-dragging");
                    if (index === null) return;
                    const from = props.editor.page().blocks.findIndex((b) => b.id === id);
                    props.editor.move(id, index > from ? index - 1 : index);
                },
            });
        });
        d.addEventListener("keydown", (e) => {
            props.onKey(e);
        });
        win.addEventListener("scroll", () => {
            props.onLayout();
        });
        win.addEventListener("resize", () => {
            props.onLayout();
        });
    }

    createEffect(() => {
        const d = doc();
        if (d) sync(d);
    });

    // On phones the settings sheet shrinks the page as it opens, which can cover the chosen block, so
    // this waits for the sheet before bringing the block back into view.
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const SHEET_MS = 340;
    createEffect(() => {
        const d = doc();
        const id = props.editor.selected();
        const win = d?.defaultView;
        if (!d || !win || !id || id === HEADER) return;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            const node = d.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
            const box = node?.getBoundingClientRect();
            if (!node || !box || (box.top >= 0 && box.bottom <= win.innerHeight)) return;
            node.scrollIntoView({ block: "center", behavior: motionOk(win) ? "smooth" : "auto" });
        }, SHEET_MS);
    });

    onCleanup(() => {
        clearTimeout(scrollTimer);
        setDoc(null);
    });

    return (
        <iframe
            class="canvas"
            title="Your page"
            srcdoc={srcdoc}
            ref={(el) => {
                frame = el;
                props.ref(el);
            }}
            onLoad={(e) => {
                const d = e.currentTarget.contentDocument;
                if (!d) return;
                const page = untrack(() => props.editor.page());
                drawnHeader = renderHeader(page, CTX);
                for (const block of page.blocks) drawn.set(block.id, renderBlock(block, CTX));
                if (!page.blocks.length) {
                    const list = d.getElementById("t-blocks");
                    if (list) list.innerHTML = EMPTY;
                }
                const line = d.createElement("div");
                line.id = "t-drop";
                d.body.append(line);
                attach(d);
                setDoc(d);
            }}
        />
    );
}
