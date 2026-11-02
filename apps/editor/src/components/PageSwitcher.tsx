import type { PageSummary } from "@tondo/contract";
import { lookNames } from "@tondo/page";
import type { Limits, LookName } from "@tondo/page";
import { looks, paint } from "@tondo/render";
import { createSignal, For, onCleanup, Show } from "solid-js";
import "../styles/pages.css";

const lookOf = (look: string): LookName =>
    (lookNames as readonly string[]).includes(look) ? (look as LookName) : "madder";

/** A small painting in the page's own colours. */
export function PageSwatch(props: { page: Pick<PageSummary, "look" | "seed"> }) {
    return (
        <span
            class="psw-dot"
            aria-hidden="true"
            ref={(el) => {
                const look = looks[lookOf(props.page.look)];
                el.innerHTML = paint(look.palette, props.page.seed ?? look.seed).replace(
                    'class="tondo"',
                    "",
                );
            }}
        />
    );
}

const statusOf = (page: PageSummary) => {
    if (!page.live) return { tone: "", label: "Not live yet" };
    if (page.offline) return { tone: "", label: "Offline" };
    return page.changed
        ? { tone: "warn", label: "Live, with unpublished changes" }
        : { tone: "ok", label: "Live" };
};

/** Opens a menu of the person's pages, oldest first, with New page at the end. */
export function PageSwitcher(props: {
    pages: readonly PageSummary[];
    current: PageSummary;
    limits: Pick<Limits, "pages" | "live">;
    /** With only the arrow showing, for beside an address that's already on screen. */
    compact?: boolean;
    onOpen?: () => void;
    onPick: (page: PageSummary) => void;
    onNew: () => void;
}) {
    const [open, setOpen] = createSignal(false);
    const [wrap, setWrap] = createSignal<HTMLDivElement>();
    const [trigger, setTrigger] = createSignal<HTMLButtonElement>();
    const close = () => {
        setOpen(false);
        trigger()?.focus();
    };
    const onOutside = (e: PointerEvent) => {
        if (open() && !wrap()?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    onCleanup(() => {
        document.removeEventListener("pointerdown", onOutside);
    });
    const onKey = (e: KeyboardEvent) => {
        if (!open()) return;
        if (e.key === "Escape") {
            close();
            return;
        }
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const items = [...(wrap()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const at = items.indexOf(document.activeElement as HTMLElement);
        const step = e.key === "ArrowDown" ? 1 : -1;
        items[(at + step + items.length) % items.length]?.focus();
    };
    const label = () => `Switch page. ${props.current.name || props.current.handle} is open`;
    return (
        <div class="psw-wrap" ref={setWrap} onKeyDown={onKey}>
            <button
                type="button"
                class="psw"
                classList={{ "psw-only": props.compact === true }}
                data-page-switcher
                aria-haspopup="menu"
                aria-expanded={open()}
                aria-label={label()}
                title={props.compact ? "Switch page" : undefined}
                ref={setTrigger}
                onClick={() => {
                    if (!open()) props.onOpen?.();
                    setOpen(!open());
                }}
            >
                <Show when={!props.compact}>
                    <PageSwatch page={props.current} />
                    <b>{props.current.name || props.current.handle}</b>
                </Show>
                <svg class="psw-chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            <Show when={open()}>
                <div class="psw-menu" role="menu" aria-label="Your pages">
                    <For each={props.pages}>
                        {(page) => {
                            const status = () => statusOf(page);
                            return (
                                <button
                                    type="button"
                                    class="psw-item"
                                    role="menuitem"
                                    data-page-item={page.handle}
                                    aria-current={page.id === props.current.id}
                                    onClick={() => {
                                        setOpen(false);
                                        props.onPick(page);
                                    }}
                                >
                                    <PageSwatch page={page} />
                                    <span class="psw-text">
                                        <b>{page.name || page.handle}</b>
                                        <small>tondo.page/{page.handle}</small>
                                    </span>
                                    <i
                                        class={`psw-state ${status().tone}`}
                                        role="img"
                                        aria-label={status().label}
                                        title={status().label}
                                    />
                                </button>
                            );
                        }}
                    </For>
                    <div class="psw-sep" />
                    <button
                        type="button"
                        class="psw-new"
                        role="menuitem"
                        data-new-page
                        onClick={() => {
                            setOpen(false);
                            props.onNew();
                        }}
                    >
                        New page
                        <small>
                            {props.pages.length} of {props.limits.pages}
                        </small>
                    </button>
                </div>
            </Show>
        </div>
    );
}
