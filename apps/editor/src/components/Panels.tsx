import {
    readLink,
    routeLink,
    sectionAvailable,
    sectionDefinition,
    sectionDefinitions,
    sectionsOf,
    sectionStatus,
} from "@tondo/page";
import type { Section, SectionDefinition } from "@tondo/page";
import { looks, lookVars, themeOf } from "@tondo/render";
import { createSignal, For, Show } from "solid-js";
import { logOut } from "../lib/account";
import { iconHtml, GRIP } from "../lib/drawings";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";

export const Glyph = (props: { name: string }) => (
    <span
        class="glyph"
        ref={(el) => {
            el.innerHTML = iconHtml(props.name);
        }}
    />
);

/** One choice in the add list. On a computer it can also be dragged to a spot on the page. */
function Pick(props: {
    definition: SectionDefinition;
    onAdd: (key: string) => void;
    onDrag?: ((key: string, name: string, e: PointerEvent) => void) | undefined;
}) {
    const usable = () => sectionAvailable(props.definition);
    return (
        <button
            type="button"
            class="add-pick"
            data-add={props.definition.key}
            disabled={!usable()}
            onClick={() => {
                props.onAdd(props.definition.key);
            }}
            onPointerDown={(e) => {
                if (usable() && e.pointerType !== "touch" && !e.button) {
                    props.onDrag?.(props.definition.key, props.definition.name, e);
                }
            }}
        >
            <span class="tico">
                <Glyph name={props.definition.icon} />
            </span>
            <span>
                <b>{props.definition.name}</b>
                <small>{props.definition.why}</small>
            </span>
            <Show when={usable()} fallback={<em class="soon-tag">Soon</em>}>
                <span class="plus">
                    <Glyph name="plus" />
                </span>
            </Show>
        </button>
    );
}

function sectionHits(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return sectionDefinitions.filter((section) =>
        `${section.name} ${section.why} ${section.words}`.toLowerCase().includes(q),
    );
}

function linkRoute(query: string) {
    const q = query.trim();
    const reading = /[./@]/.test(q) || /^\+?\d[\d ()-]{5,}$/.test(q) ? readLink(q) : null;
    return reading?.state === "ok"
        ? { ...routeLink(reading.url), detail: reading.label, url: reading.url }
        : null;
}

function RoutePick(props: {
    found: NonNullable<ReturnType<typeof linkRoute>>;
    onAdd: (url: string) => void;
}) {
    return (
        <button
            type="button"
            class="add-pick"
            data-route={props.found.url}
            onClick={() => {
                props.onAdd(props.found.url);
            }}
        >
            <span class="tico">
                <Glyph name={sectionDefinition(props.found.key)?.icon ?? "link"} />
            </span>
            <span>
                <b>{props.found.label}</b>
                <small>{props.found.detail}</small>
            </span>
            <span class="plus">
                <Glyph name="plus" />
            </span>
        </button>
    );
}

export function AddList(props: {
    editor: EditorState;
    onAdd: (key: string) => void;
    onAddedLink: () => void;
    onDrag?: (key: string, name: string, e: PointerEvent) => void;
}) {
    const [query, setQuery] = createSignal("");
    const hits = () => sectionHits(query());
    const route = () => linkRoute(query());
    const main = sectionDefinitions.filter((section) => !section.less);
    const less = sectionDefinitions.filter((section) => section.less);
    const addLink = (url: string) => {
        if (props.editor.addFromLink(url)) props.onAddedLink();
    };
    return (
        <>
            <div class="find add-find">
                <Glyph name="search" />
                <input
                    id="add-q"
                    placeholder="Search sections, or paste a link"
                    aria-label="Search sections, or paste a link"
                    autocomplete="off"
                    ref={(input) => {
                        // A phone's keyboard would cover the list it's there to choose from.
                        if (window.matchMedia("(min-width: 861px)").matches) {
                            queueMicrotask(() => {
                                input.focus();
                            });
                        }
                    }}
                    value={query()}
                    onInput={(e) => setQuery(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape" && query()) {
                            e.stopPropagation();
                            setQuery("");
                        }
                        if (e.key === "Enter") {
                            const found = route();
                            const first = hits().find(sectionAvailable);
                            if (found) addLink(found.url);
                            else if (first) props.onAdd(first.key);
                        }
                    }}
                />
            </div>
            <Show
                when={query().trim()}
                fallback={
                    <>
                        <For each={main}>
                            {(definition) => (
                                <Pick
                                    definition={definition}
                                    onAdd={props.onAdd}
                                    onDrag={props.onDrag}
                                />
                            )}
                        </For>
                        <div class="grp">Less common</div>
                        <For each={less}>
                            {(definition) => (
                                <Pick
                                    definition={definition}
                                    onAdd={props.onAdd}
                                    onDrag={props.onDrag}
                                />
                            )}
                        </For>
                    </>
                }
            >
                <Show when={route()}>
                    {(found) => <RoutePick found={found()} onAdd={addLink} />}
                </Show>
                <For each={hits()}>
                    {(definition) => (
                        <Pick definition={definition} onAdd={props.onAdd} onDrag={props.onDrag} />
                    )}
                </For>
                <Show when={!route() && !hits().length}>
                    <p class="hint-box">Nothing matches that. Try another word, or paste a link.</p>
                </Show>
            </Show>
        </>
    );
}

function Row(props: {
    editor: EditorState;
    section: Section;
    index: number;
    count: number;
    onGrip: (id: string, e: PointerEvent) => void;
}) {
    const status = () => sectionStatus(props.section);
    const hidden = () => Boolean(props.section.blocks[0]?.hidden);
    const id = () => props.section.id;
    return (
        <div
            class="row"
            classList={{ sel: props.editor.selected() === id(), off: hidden() }}
            data-id={id()}
            role="button"
            tabindex="0"
            onClick={() => {
                props.editor.select(id());
            }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    props.editor.select(id());
                }
                if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                    e.preventDefault();
                    e.stopPropagation();
                    props.editor.moveSection(id(), props.index + (e.key === "ArrowUp" ? -1 : 1));
                }
            }}
        >
            <span
                class="grip2"
                title="Drag to reorder"
                ref={(el) => {
                    el.innerHTML = GRIP;
                }}
                onPointerDown={(e) => {
                    props.onGrip(id(), e);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            />
            <span class="tico">
                <Glyph name={props.section.definition.icon} />
            </span>
            <span class="row-t">
                <b>{props.section.definition.name}</b>
                <small classList={{ todo: Boolean(status()) }}>
                    {hidden() ? "Hidden" : (status() ?? "Ready")}
                </small>
            </span>
            <span class="row-acts">
                <button
                    type="button"
                    class="tb"
                    aria-label={`Move ${props.section.definition.name} up`}
                    disabled={props.index === 0}
                    onClick={(e) => {
                        e.stopPropagation();
                        props.editor.moveSection(id(), props.index - 1);
                    }}
                >
                    <Glyph name="up" />
                </button>
                <button
                    type="button"
                    class="tb"
                    aria-label={`Move ${props.section.definition.name} down`}
                    disabled={props.index === props.count - 1}
                    onClick={(e) => {
                        e.stopPropagation();
                        props.editor.moveSection(id(), props.index + 1);
                    }}
                >
                    <Glyph name="down2" />
                </button>
            </span>
        </div>
    );
}

/** The list of what's on the page, plus the one box for adding by pasting or searching. */
export function PagePanel(props: {
    editor: EditorState;
    onOpenLook: () => void;
    onOpenAdd: () => void;
    onAdded: () => void;
    onDiscard: () => void;
    /** While a section is dragged on the phone, the list shows where it's landing. */
    dragOrder: () => { id: string; to: number } | null;
}) {
    const [query, setQuery] = createSignal("");
    const [listDrag, setListDrag] = createSignal<{ id: string; to: number } | null>(null);
    const sections = () => sectionsOf(props.editor.page().blocks);
    const ordered = () => {
        const moving = props.dragOrder() ?? listDrag();
        const list = sections();
        if (!moving) return list;
        const item = list.find((section) => section.id === moving.id);
        if (!item) return list;
        const rest = list.filter((section) => section.id !== moving.id);
        rest.splice(moving.to, 0, item);
        return rest;
    };
    const look = () => looks[props.editor.page().look];
    const hits = () => sectionHits(query());
    const route = () => linkRoute(query());
    const addFromLink = (url: string) => {
        if (props.editor.addFromLink(url)) {
            setQuery("");
            props.onAdded();
        }
    };
    const add = (key: string) => {
        props.editor.addSection(key);
        setQuery("");
        props.onAdded();
    };

    const [rows, setRows] = createSignal<HTMLDivElement>();
    const startRowDrag = (id: string, e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const move = (ev: PointerEvent) => {
            ev.preventDefault();
            const others = [...(rows()?.children ?? [])].filter(
                (node) => node.getAttribute("data-id") !== id,
            );
            const after = others.findIndex((node) => {
                const box = node.getBoundingClientRect();
                return ev.clientY < box.top + box.height / 2;
            });
            setListDrag({ id, to: after < 0 ? others.length : after });
        };
        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
            const landed = listDrag();
            setListDrag(null);
            if (ev.type === "pointerup" && landed) props.editor.moveSection(id, landed.to);
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
    };

    return (
        <>
            <div class="find">
                <Glyph name="search" />
                <input
                    id="q"
                    placeholder="Paste a link, or search to add"
                    aria-label="Paste a link, or search for a section"
                    autocomplete="off"
                    value={query()}
                    onInput={(e) => setQuery(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.stopPropagation();
                            setQuery("");
                        }
                        if (e.key === "Enter") {
                            const r = route();
                            const first = hits().find(sectionAvailable);
                            if (r) addFromLink(r.url);
                            else if (first) add(first.key);
                        }
                    }}
                />
            </div>
            <Show
                when={query().trim()}
                fallback={
                    <>
                        <button
                            type="button"
                            class="style-entry"
                            onClick={() => {
                                props.onOpenLook();
                            }}
                        >
                            <span
                                class="look-tile"
                                aria-hidden="true"
                                style={{
                                    "background-image": `url(/photos/looks/${props.editor.page().look}.jpg)`,
                                }}
                            />
                            <span>
                                <b>Look</b>
                                <small>{look().label}</small>
                            </span>
                            <Glyph name="back" />
                        </button>
                        <div
                            class="row head-row"
                            classList={{ sel: props.editor.selected() === HEADER }}
                            role="button"
                            tabindex="0"
                            onClick={() => {
                                props.editor.select(HEADER);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") props.editor.select(HEADER);
                            }}
                        >
                            <span />
                            <span class="tico">
                                <Glyph name="hand" />
                            </span>
                            <span class="row-t">
                                <b>{props.editor.page().header.name || "Your name"}</b>
                                <small>Your name, photo and links</small>
                            </span>
                        </div>
                        <div class="rows" id="rows" ref={setRows}>
                            <For each={ordered()}>
                                {(section, index) => (
                                    <Row
                                        editor={props.editor}
                                        section={section}
                                        index={index()}
                                        count={ordered().length}
                                        onGrip={startRowDrag}
                                    />
                                )}
                            </For>
                        </div>
                        <button
                            type="button"
                            class="add-row"
                            onClick={() => {
                                props.onOpenAdd();
                            }}
                        >
                            <Glyph name="plus" />
                            Add a section
                        </button>
                        <Show when={props.editor.hasLive() && props.editor.changed()}>
                            <button
                                type="button"
                                class="discard-open"
                                onClick={() => {
                                    props.onDiscard();
                                }}
                            >
                                Discard changes, back to live
                            </button>
                        </Show>
                        <button type="button" class="prev logout phone-only" onClick={logOut}>
                            Log out
                        </button>
                    </>
                }
            >
                <Show when={route()}>
                    {(found) => <RoutePick found={found()} onAdd={addFromLink} />}
                </Show>
                <For each={hits()}>
                    {(definition) => <Pick definition={definition} onAdd={add} />}
                </For>
                <Show when={!route() && !hits().length}>
                    <p class="hint-box">Nothing matches that. Try another word, or paste a link.</p>
                </Show>
            </Show>
        </>
    );
}

/** The chosen look as a quiet two-tone chip: its page background and its button colour. */
export function LookMini(props: { editor: EditorState }) {
    const vars = () => {
        const page = props.editor.page();
        return { ...lookVars(page.look, looks[page.look]), ...(themeOf(page)?.vars ?? {}) };
    };
    return (
        <span class="tico look-mini" aria-hidden="true">
            <i style={vars()} />
        </span>
    );
}
