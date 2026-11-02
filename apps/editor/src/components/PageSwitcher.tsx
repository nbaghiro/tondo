import type { PageSummary } from "@tondo/contract";
import type { Limits } from "@tondo/page";
import { createSignal, For, onCleanup, Show } from "solid-js";
import "../styles/pages.css";

/**
 * Stands for one page, so it can't be read as the round logo beside it: the page's own photo, or its
 * look's art with the first letter of its name.
 */
export function PageTile(props: { page: Pick<PageSummary, "look" | "photo" | "name" | "handle"> }) {
    const letter = () => (props.page.name || props.page.handle).slice(0, 1).toUpperCase();
    return (
        <Show
            when={props.page.photo}
            fallback={
                <span
                    class="psw-tile"
                    aria-hidden="true"
                    style={{ "background-image": `url(/photos/looks/${props.page.look}.jpg)` }}
                >
                    <em>{letter()}</em>
                </span>
            }
        >
            {(photo) => (
                <span
                    class="psw-tile"
                    aria-hidden="true"
                    style={{ "background-image": `url(/photos/${photo()})` }}
                />
            )}
        </Show>
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
    teamName?: string | undefined;
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
    const mine = () => props.pages.filter((page) => page.side === "own" || page.side === "joined");
    const onTeam = () =>
        props.pages.filter((page) => page.side === "team" || page.side === "teammate");
    const item = (page: PageSummary) => {
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
                <PageTile page={page} />
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
                    <PageTile page={props.current} />
                    <b>{props.current.name || props.current.handle}</b>
                </Show>
                <svg class="psw-chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
            <Show when={open()}>
                <div class="psw-menu" role="menu" aria-label="Your pages">
                    <For each={mine()}>{item}</For>
                    <Show when={onTeam().length}>
                        <p class="psw-group" data-team-pages>
                            {props.teamName ?? "Your team"}
                        </p>
                        <For each={onTeam()}>{item}</For>
                    </Show>
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
                            {props.pages.filter((page) => page.side === "own").length} of{" "}
                            {props.limits.pages}
                        </small>
                    </button>
                </div>
            </Show>
        </div>
    );
}
