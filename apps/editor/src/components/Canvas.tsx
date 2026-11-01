import { findBlock, findSection, sectionsOf } from "@tondo/page";
import type { Page, Section } from "@tondo/page";
import {
    fontsHref,
    renderBlock,
    renderCss,
    renderDocument,
    renderHeader,
    photoStandIns,
} from "@tondo/render";
import { createEffect, createSignal, onCleanup, untrack } from "solid-js";
import { GRIP, iconHtml } from "../lib/drawings";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import canvasCss from "../styles/canvas.css?inline";

const CTX = { assetBase: "/photos/", editable: true };
const EMPTY = `<div class="t-empty"><b>Your page is empty</b><span>Add a section to start.</span></div>`;

const LIFT_PX = 5;
const HOLD_MS = 380;
const HOLD_SLOP = 9;
const EDGE = 64;
const EDGE_SPEED = 11;
const SHEET_MS = 340;

interface CanvasProps {
    editor: EditorState;
    ref: (frame: HTMLIFrameElement) => void;
    /** Opens the list of sections to add, below the given one. */
    onAddBelow: (id: string) => void;
    onKey: (event: KeyboardEvent) => void;
    /** A drag has started, so a phone's sheet should get out of the way. */
    onDragStart: () => void;
    /** The section being dragged is now over this position, for the list to follow. */
    onDragOver: (id: string, to: number) => void;
    onDragEnd: () => void;
    /** The header's icons were tapped, so the panel should open at them. */
    onSocialIcons: () => void;
    /** A plain click on the page outside any section or the header. */
    onOutside: () => void;
}

interface Drag {
    node: HTMLElement;
    nodes: HTMLElement[];
    tops: number[];
    heights: number[];
    from: number;
    to: number;
    startPage: number;
    y: number;
    slot: HTMLElement;
    id: string;
    raf: number;
}

const motionOk = (win: Window) => !win.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Canvas(props: CanvasProps) {
    const [doc, setDoc] = createSignal<Document | null>(null);
    const drawn = new Map<string, string>();
    let drawnHeader = "";
    let editing: string | null = null;
    let drag: Drag | null = null;
    let ignoreClick = false;

    const srcdoc = untrack(() =>
        renderDocument(props.editor.page(), { ...CTX, title: "Preview", editorCss: canvasCss }),
    );
    const ctxFor = (page: Page) => ({ ...CTX, ...photoStandIns(page) });

    function syncLook(d: Document, page: Page) {
        const styles = d.getElementById("t-styles");
        const css = renderCss(page);
        if (styles && styles.textContent !== css) styles.textContent = css;
        const fonts = d.getElementById("t-fonts");
        const href = fontsHref(page);
        if (fonts && fonts.getAttribute("href") !== href) fonts.setAttribute("href", href);
        d.documentElement.className = `look ${page.look}${drag ? " t-dragging" : ""}`;
    }

    function syncHeader(d: Document, page: Page) {
        const html = renderHeader(page, ctxFor(page));
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

    function editingBlock(page: Page): string | null {
        if (!editing) return null;
        return findBlock(page, editing)?.place?.tabs ?? editing;
    }

    function syncSectionBlocks(d: Document, host: Element, section: Section, page: Page) {
        const ctx = ctxFor(page);
        const wanted = new Set(section.all.map((block) => block.id));
        for (const node of [...host.querySelectorAll(":scope > .t-block")]) {
            const id = node.getAttribute("data-block-id");
            if (!id || !wanted.has(id)) node.remove();
        }
        section.all.forEach((block, position) => {
            const html = renderBlock(block, ctx);
            let node = host.querySelector(`:scope > [data-block-id="${CSS.escape(block.id)}"]`);
            if (!node) {
                node = makeNode(d, html);
                if (!node) return;
                drawn.set(block.id, html);
            } else if (drawn.get(block.id) !== html && editingBlock(page) !== block.id) {
                const fresh = makeNode(d, html);
                if (fresh) {
                    node.replaceWith(fresh);
                    node = fresh;
                }
                drawn.set(block.id, html);
            }
            const current = host.querySelectorAll(":scope > .t-block")[position];
            if (current !== node) host.insertBefore(node, current ?? null);
        });
    }

    function syncBlocks(d: Document, page: Page) {
        const list = d.getElementById("t-blocks");
        if (!list) return;
        const sections = sectionsOf(page.blocks);
        const before = new Map(
            [...list.children].map((node) => [
                node.getAttribute("data-s") ?? "",
                node.getBoundingClientRect().top,
            ]),
        );
        const orderBefore = [...before.keys()].filter((id) => sections.some((s) => s.id === id));
        const wanted = new Set(sections.map((section) => section.id));
        for (const node of [...list.children]) {
            const id = node.getAttribute("data-s");
            if (!id || !wanted.has(id)) node.remove();
        }
        const added: Element[] = [];
        sections.forEach((section, position) => {
            let host = list.querySelector(`:scope > [data-s="${CSS.escape(section.id)}"]`);
            if (!host) {
                host = d.createElement("section");
                host.className = "t-s";
                host.setAttribute("data-s", section.id);
                const grip = makeNode(
                    d,
                    `<button class="t-grip" data-t="drag" tabindex="-1" aria-hidden="true" title="Drag to move">${GRIP}</button>`,
                );
                if (grip) host.append(grip);
                added.push(host);
            }
            syncSectionBlocks(d, host, section, page);
            host.classList.toggle("t-tint", Boolean(section.blocks[0]?.tint));
            if (list.children[position] !== host) {
                list.insertBefore(host, list.children[position] ?? null);
            }
        });
        if (!sections.length) list.innerHTML = EMPTY;

        const win = d.defaultView;
        if (!win || !motionOk(win)) return;
        const orderAfter = sections.map((s) => s.id).filter((id) => before.has(id));
        if (orderBefore.join() !== orderAfter.join()) {
            for (const node of list.children) {
                const was = before.get(node.getAttribute("data-s") ?? "");
                if (was === undefined) continue;
                const distance = was - node.getBoundingClientRect().top;
                if (distance) {
                    node.animate(
                        [{ transform: `translateY(${String(distance)}px)` }, { transform: "none" }],
                        { duration: 280, easing: "cubic-bezier(.2,.85,.25,1)" },
                    );
                }
            }
        }
        for (const node of added) node.classList.add("t-fresh");
    }

    // The shown tab is the editor's choice, and redrawing a block would otherwise reset it.
    function syncTabs(d: Document, page: Page) {
        for (const block of page.blocks) {
            if (block.type !== "tabs") continue;
            const tab = props.editor.shownTab(block);
            const position = block.tabs.findIndex((other) => other.id === tab);
            const node = d.querySelector(`[data-block-id="${CSS.escape(block.id)}"]`);
            const input = node?.querySelector<HTMLInputElement>(
                `:scope .b-tabs > .t${String(position)}`,
            );
            if (input) input.checked = true;
        }
    }

    function toolsHtml(index: number, count: number, name: string) {
        const label = name.replace(/"/g, "");
        return `<div class="t-tools" id="t-tools" role="toolbar" aria-label="${label}"><button class="t-move" data-t="drag" title="Drag to move">${GRIP}<span>Move</span></button><button data-t="up" aria-label="Move ${label} up" ${index ? "" : "disabled"}>${iconHtml("up")}</button><button data-t="down" aria-label="Move ${label} down" ${index < count - 1 ? "" : "disabled"}>${iconHtml("down2")}</button><button data-t="copy" aria-label="Copy ${label}">${iconHtml("copy")}</button><button data-t="remove" aria-label="Remove ${label}">${iconHtml("trash")}</button></div>`;
    }
    const BELOW = `<button class="t-below" id="t-below" data-t="below">${iconHtml("plus")}Add below</button>`;

    function syncSelection(d: Document, page: Page, selected: string | null) {
        for (const node of d.querySelectorAll(".t-sel")) node.classList.remove("t-sel");
        d.getElementById("t-tools")?.remove();
        d.getElementById("t-below")?.remove();
        if (!selected) return;
        if (selected === HEADER) {
            const head = d.getElementById("t-header");
            head?.classList.add("t-sel");
            const below = makeNode(d, BELOW);
            if (below) head?.append(below);
            return;
        }
        const found = findSection(page, selected);
        if (!found) return;
        const hosts = found.place
            ? found.section.all.flatMap((block) => [
                  ...d.querySelectorAll(`[data-block-id="${CSS.escape(block.id)}"]`),
              ])
            : [...d.querySelectorAll(`[data-s="${CSS.escape(found.section.id)}"]`)];
        for (const node of hosts) node.classList.add("t-sel");
        const host = hosts[0];
        if (!host) return;
        const tools = makeNode(
            d,
            toolsHtml(found.index, found.list.length, found.section.definition.name),
        );
        const below = makeNode(d, BELOW);
        if (tools) host.append(tools);
        if (below) (hosts.at(-1) ?? host).append(below);
    }

    // Changing the look or its painting opens up from the middle, like paint spreading.
    let drawnLook = "";
    const lookKey = (page: Page) =>
        [
            page.look,
            page.seed ?? "",
            page.paint?.join() ?? "",
            JSON.stringify(page.style ?? ""),
        ].join("|");

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
        syncTabs(d, page);
        syncSelection(d, page, props.editor.selected());
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
                drawn.delete(findBlock(props.editor.page(), target)?.place?.tabs ?? target);
                drawnHeader = target === HEADER ? "" : drawnHeader;
                sync(d);
            },
            { once: true },
        );
    }

    function toolAction(action: string, id: string) {
        const found = findSection(props.editor.page(), id);
        if (action === "below") {
            props.onAddBelow(id);
            return;
        }
        if (!found) return;
        if (action === "up") props.editor.moveSection(id, found.index - 1);
        if (action === "down") props.editor.moveSection(id, found.index + 1);
        if (action === "copy") props.editor.duplicate(id);
        if (action === "remove") props.editor.remove(id);
    }

    // Moving by dragging. Pointer capture waits until a drag really starts, so plain taps stay
    // clicks, and a touch only becomes a drag after a held press or on the handle.
    function layoutDrag(d: Document) {
        const win = d.defaultView;
        if (!drag || !win) return;
        const current = drag;
        const dy = current.y + win.scrollY - current.startPage;
        const height = current.heights[current.from] ?? 0;
        current.node.style.transform = `translateY(${String(dy)}px)`;
        const centre = (current.tops[current.from] ?? 0) + height / 2 + dy;
        let to = 0;
        current.nodes.forEach((_node, i) => {
            if (
                i !== current.from &&
                centre > (current.tops[i] ?? 0) + (current.heights[i] ?? 0) / 2
            ) {
                to++;
            }
        });
        current.nodes.forEach((node, i) => {
            if (i === current.from) return;
            const position = i < current.from ? i : i - 1;
            node.style.transform =
                position >= to && i < current.from
                    ? `translateY(${String(height)}px)`
                    : position < to && i > current.from
                      ? `translateY(${String(-height)}px)`
                      : "";
        });
        const page = d.querySelector(".page")?.getBoundingClientRect().top ?? 0;
        const order = current.nodes.map((_n, i) => i).filter((i) => i !== current.from);
        let top = Math.min(...current.tops);
        for (let i = 0; i < to; i++) top += current.heights[order[i] ?? 0] ?? 0;
        current.slot.style.top = `${String(top - page - win.scrollY)}px`;
        if (to !== current.to) {
            current.to = to;
            props.onDragOver(current.id, to);
        }
    }

    function tick(d: Document) {
        const win = d.defaultView;
        if (!drag || !win) return;
        const height = win.innerHeight;
        const speed =
            drag.y < EDGE
                ? -EDGE_SPEED * (1 - drag.y / EDGE)
                : drag.y > height - EDGE
                  ? EDGE_SPEED * (1 - (height - drag.y) / EDGE)
                  : 0;
        if (speed) win.scrollBy(0, speed);
        layoutDrag(d);
        drag.raf = win.requestAnimationFrame(() => {
            tick(d);
        });
    }

    function beginDrag(
        d: Document,
        node: HTMLElement,
        y: number,
        pointer: number,
        captor: Element,
    ) {
        const win = d.defaultView;
        const parent = node.parentElement;
        if (!win || !parent) return;
        const nodes = [...parent.children].filter((child): child is HTMLElement =>
            child.matches("section.t-s, .t-block"),
        );
        const from = nodes.indexOf(node);
        if (from < 0) return;
        const tops = nodes.map((other) => other.getBoundingClientRect().top + win.scrollY);
        const heights = nodes.map((other) => other.getBoundingClientRect().height);
        try {
            captor.setPointerCapture(pointer);
        } catch {
            // The pointer may already have gone, and dragging still works without capture.
        }
        props.onDragStart();
        d.documentElement.classList.add("t-dragging");
        node.classList.add("t-lift");
        const slot = d.createElement("div");
        slot.className = "t-slot";
        d.querySelector(".page")?.append(slot);
        drag = {
            node,
            nodes,
            tops,
            heights,
            from,
            to: from,
            startPage: y + win.scrollY,
            y,
            slot,
            id: node.getAttribute("data-s") ?? node.getAttribute("data-block-id") ?? "",
            raf: 0,
        };
        layoutDrag(d);
        tick(d);
    }

    function endDrag(d: Document, keep: boolean) {
        const current = drag;
        const win = d.defaultView;
        if (!current || !win) return;
        drag = null;
        win.cancelAnimationFrame(current.raf);
        d.documentElement.classList.remove("t-dragging");
        current.node.classList.remove("t-lift");
        for (const node of current.nodes) node.style.transform = "";
        current.slot.remove();
        props.onDragEnd();
        ignoreClick = true;
        setTimeout(() => {
            ignoreClick = false;
        }, 60);
        const found = findSection(props.editor.page(), current.id);
        if (keep && found && current.to !== current.from) {
            props.editor.moveSection(found.section.id, current.to);
        } else if (found) {
            props.editor.select(found.section.id);
        }
    }

    function attach(d: Document) {
        const win = d.defaultView;
        if (!win) return;
        const element = (target: EventTarget | null) =>
            target instanceof win.Element ? target : null;
        const draggable = (target: Element | null) =>
            target?.closest<HTMLElement>("section.t-s, .b-panel > .t-block") ?? null;

        let downAt = { x: 0, y: 0 };
        d.addEventListener(
            "pointerdown",
            (e) => {
                downAt = { x: e.clientX, y: e.clientY };
            },
            true,
        );
        d.addEventListener("click", (e) => {
            e.preventDefault();
            if (ignoreClick) return;
            const target = element(e.target);
            if (target?.closest("[contenteditable]")) return;
            const action = target?.closest<HTMLElement>("[data-t]");
            const selected = props.editor.selected();
            if (action && selected) {
                toolAction(action.dataset["t"] ?? "", selected);
                return;
            }
            if (target?.closest("#t-header .b-social")) {
                props.onSocialIcons();
                return;
            }
            if (target?.closest("#t-header")) {
                const field = target.closest("[data-field]");
                const touch = win.matchMedia("(pointer: coarse)").matches;
                if (selected === HEADER && field instanceof win.HTMLElement && !touch) {
                    startInline(field, HEADER, d);
                } else {
                    props.editor.select(HEADER);
                }
                return;
            }
            const owner = target?.closest("[data-block-id]");
            const blockId = owner?.getAttribute("data-block-id");
            if (!blockId) {
                // Selecting text or dragging across the page isn't a click on the page.
                const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5;
                if (!moved && win.getSelection()?.isCollapsed !== false) props.onOutside();
                return;
            }
            const tabLabel = target?.closest(".b-tabbar label");
            const sectionId = findSection(props.editor.page(), blockId)?.section.id ?? blockId;
            if (tabLabel) {
                const position = [...(tabLabel.parentElement?.children ?? [])].indexOf(tabLabel);
                props.editor.showTab(blockId, position);
                props.editor.select(sectionId);
                return;
            }
            const field = target?.closest("[data-field]");
            const touch = win.matchMedia("(pointer: coarse)").matches;
            if (sectionId === selected && field instanceof win.HTMLElement && !touch) {
                startInline(field, blockId, d);
            } else {
                props.editor.select(sectionId);
            }
        });
        d.addEventListener("submit", (e) => {
            e.preventDefault();
        });

        let armed: {
            node: HTMLElement;
            x: number;
            y: number;
            pointer: number;
            target: Element;
            handle: boolean;
            timer?: ReturnType<typeof setTimeout>;
        } | null = null;
        const disarm = () => {
            if (armed?.timer) clearTimeout(armed.timer);
            armed = null;
        };
        d.addEventListener("pointerdown", (e) => {
            if (e.button) return;
            const target = element(e.target);
            if (!target || target.closest("[contenteditable]")) return;
            const handle = target.closest('[data-t="drag"]');
            const node = handle
                ? (draggable(target) ?? null)
                : e.pointerType === "touch"
                  ? draggable(target)
                  : null;
            if (!node) return;
            if (target.closest('[data-t]:not([data-t="drag"])')) return;
            armed = {
                node,
                x: e.clientX,
                y: e.clientY,
                pointer: e.pointerId,
                target,
                handle: Boolean(handle),
            };
            if (handle) {
                e.preventDefault();
                return;
            }
            armed.timer = setTimeout(() => {
                if (!armed) return;
                const held = armed;
                armed = null;
                beginDrag(d, held.node, held.y, held.pointer, held.target);
            }, HOLD_MS);
        });
        d.addEventListener("pointermove", (e) => {
            if (drag) {
                e.preventDefault();
                drag.y = e.clientY;
                return;
            }
            if (!armed) return;
            const moved = Math.hypot(e.clientY - armed.y, e.clientX - armed.x);
            if (armed.handle) {
                if (moved > LIFT_PX) {
                    const held = armed;
                    armed = null;
                    beginDrag(d, held.node, held.y, held.pointer, held.target);
                }
            } else if (moved > HOLD_SLOP) {
                disarm();
            }
        });
        // A held finger mustn't scroll the page once a section is lifted. Before that, scrolling wins.
        d.addEventListener(
            "touchmove",
            (e) => {
                if (drag) e.preventDefault();
            },
            { passive: false },
        );
        d.addEventListener("pointerup", () => {
            disarm();
            if (drag) endDrag(d, true);
        });
        d.addEventListener("pointercancel", () => {
            disarm();
            if (drag) endDrag(d, false);
        });
        d.addEventListener("contextmenu", (e) => {
            if (armed || drag) e.preventDefault();
        });
        d.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && drag) {
                endDrag(d, false);
                return;
            }
            props.onKey(e);
        });
    }

    createEffect(() => {
        const d = doc();
        if (d) sync(d);
    });

    // On phones the sheet shrinks the page as it opens, which can cover the chosen section, so this
    // waits for the sheet before bringing it back into view.
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    createEffect(() => {
        const d = doc();
        const id = props.editor.selected();
        const win = d?.defaultView;
        if (!d || !win || !id || id === HEADER) return;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            const node = d.querySelector(".t-sel");
            const box = node?.getBoundingClientRect();
            if (!node || !box || (box.top >= 0 && box.bottom <= win.innerHeight)) return;
            // Scrolls only this frame. scrollIntoView would also move the screen around it.
            const offset = box.height > win.innerHeight ? 0 : (win.innerHeight - box.height) / 2;
            win.scrollBy({
                top: box.top - offset,
                behavior: motionOk(win) ? "smooth" : "auto",
            });
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
                props.ref(el);
            }}
            onLoad={(e) => {
                const d = e.currentTarget.contentDocument;
                if (!d) return;
                const page = untrack(() => props.editor.page());
                drawnHeader = "";
                drawn.clear();
                const list = d.getElementById("t-blocks");
                if (list) list.innerHTML = "";
                attach(d);
                setDoc(d);
                untrack(() => {
                    syncHeader(d, page);
                });
            }}
        />
    );
}
