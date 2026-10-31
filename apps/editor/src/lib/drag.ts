import { frameToWindow, windowToFrame } from "./frame";
import type { Point } from "./frame";

const START_DISTANCE = 6;
const EDGE = 60;
const EDGE_SPEED = 9;
/** How far outside the page a drop still counts. */
const MARGIN = 50;

export interface DragOptions {
    event: PointerEvent;
    /** The element that started the drag. It captures the pointer, so moves keep arriving here. */
    source: Element;
    frame: HTMLIFrameElement;
    /** True when the drag started inside the iframe, so positions are relative to it. */
    fromFrame: boolean;
    label: string;
    onStart?: () => void;
    /** Called with the position in the block list, or null if it was dropped elsewhere. */
    onEnd: (index: number | null) => void;
}

function dropIndex(doc: Document, y: number): { index: number; line: number } {
    const nodes = [...doc.querySelectorAll("#t-blocks > .t-block")];
    for (const [index, node] of nodes.entries()) {
        const box = node.getBoundingClientRect();
        if (y < box.top + box.height / 2) return { index, line: box.top };
    }
    const last = nodes.at(-1)?.getBoundingClientRect();
    const list = doc.getElementById("t-blocks")?.getBoundingClientRect();
    return { index: nodes.length, line: last?.bottom ?? list?.top ?? 0 };
}

const isPointerEvent = (e: Event): e is PointerEvent => "clientX" in e;

export function startDrag(options: DragOptions): void {
    const { event, source, frame, fromFrame, label, onStart, onEnd } = options;
    const doc = frame.contentDocument;
    const scroller = doc?.scrollingElement;
    const line = doc?.getElementById("t-drop");
    // The iframe has its own copies of DOM classes, so its elements fail instanceof checks from here.
    if (!doc || !scroller || !line) return;

    const start: Point = { x: event.clientX, y: event.clientY };
    let current = start;
    let dragging = false;
    let index: number | null = null;
    let raf = 0;
    let ghost: HTMLElement | null = null;

    const inFrame = () => (fromFrame ? current : windowToFrame(frame, current));
    const inWindow = () => (fromFrame ? frameToWindow(frame, current) : current);

    const update = () => {
        const point = inFrame();
        const inside =
            point.x > -MARGIN &&
            point.x < frame.clientWidth + MARGIN &&
            point.y > -MARGIN &&
            point.y < frame.clientHeight + MARGIN;
        if (inside) {
            if (point.y < EDGE) scroller.scrollTop -= EDGE_SPEED;
            else if (point.y > frame.clientHeight - EDGE) scroller.scrollTop += EDGE_SPEED;
            const found = dropIndex(doc, point.y);
            index = found.index;
            line.style.top = `${found.line}px`;
            line.style.opacity = "1";
        } else {
            index = null;
            line.style.opacity = "0";
        }
        const at = inWindow();
        if (ghost) ghost.style.transform = `translate(${at.x}px, ${at.y}px)`;
        raf = requestAnimationFrame(update);
    };

    const onMove = (e: Event) => {
        if (!isPointerEvent(e)) return;
        current = { x: e.clientX, y: e.clientY };
        if (dragging || Math.hypot(current.x - start.x, current.y - start.y) < START_DISTANCE)
            return;
        dragging = true;
        // Capturing any earlier would redirect a plain click to this element.
        source.setPointerCapture(event.pointerId);
        ghost = document.createElement("div");
        ghost.className = "drag-ghost";
        ghost.textContent = label;
        document.body.append(ghost);
        document.body.classList.add("is-dragging");
        onStart?.();
        raf = requestAnimationFrame(update);
    };

    const finish = (dropped: boolean) => {
        source.removeEventListener("pointermove", onMove);
        source.removeEventListener("pointerup", onUp);
        source.removeEventListener("pointercancel", onCancel);
        cancelAnimationFrame(raf);
        document.body.classList.remove("is-dragging");
        line.style.opacity = "0";
        ghost?.remove();
        if (!dragging) return;
        // The browser fires a click after the pointer lifts, which mustn't select anything.
        const swallow = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
        };
        const targets = [window, doc];
        for (const target of targets) target.addEventListener("click", swallow, { capture: true });
        setTimeout(() => {
            for (const target of targets)
                target.removeEventListener("click", swallow, { capture: true });
        }, 60);
        onEnd(dropped ? index : null);
    };
    const onUp = () => {
        finish(true);
    };
    const onCancel = () => {
        finish(false);
    };

    source.addEventListener("pointermove", onMove);
    source.addEventListener("pointerup", onUp);
    source.addEventListener("pointercancel", onCancel);
}
