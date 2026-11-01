import {
    findSection,
    readLink,
    routeLink,
    sectionAvailable,
    sectionDefinition,
    sectionDefinitions,
    sectionsOf,
    sectionStatus,
} from "@tondo/page";
import type { Section, SectionDefinition } from "@tondo/page";
import { looks } from "@tondo/render";
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

const LOOK_TILES = "/photos/looks/";

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

export function AddList(props: {
    editor: EditorState;
    onAdd: (key: string) => void;
    onDrag?: (key: string, name: string, e: PointerEvent) => void;
}) {
    const where = () => {
        const id = props.editor.selected();
        if (id === HEADER) return "at the top";
        const found = id ? findSection(props.editor.page(), id) : null;
        return found ? `below ${found.section.definition.name}` : "at the end";
    };
    const main = sectionDefinitions.filter((section) => !section.less);
    const less = sectionDefinitions.filter((section) => section.less);
    return (
        <>
            <p class="where">
                Tap to add it {where()}
                <span class="wide-only">, or drag it to the spot you want on your page</span>.
            </p>
            <For each={main}>
                {(definition) => (
                    <Pick definition={definition} onAdd={props.onAdd} onDrag={props.onDrag} />
                )}
            </For>
            <div class="grp">Less common</div>
            <For each={less}>
                {(definition) => (
                    <Pick definition={definition} onAdd={props.onAdd} onDrag={props.onDrag} />
                )}
            </For>
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
    const hits = () => {
        const q = query().trim().toLowerCase();
        if (!q) return [];
        return sectionDefinitions.filter((section) =>
            `${section.name} ${section.why} ${section.words}`.toLowerCase().includes(q),
        );
    };
    const reading = () => {
        const q = query().trim();
        return /[./@]/.test(q) || /^\+?\d[\d ()-]{5,}$/.test(q) ? readLink(q) : null;
    };
    const route = () => {
        const r = reading();
        return r?.state === "ok" ? { ...routeLink(r.url), detail: r.label, url: r.url } : null;
    };
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
                            <LookMini editor={props.editor} />
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
                    {(found) => (
                        <button
                            type="button"
                            class="add-pick"
                            data-route={found().url}
                            onClick={() => {
                                addFromLink(found().url);
                            }}
                        >
                            <span class="tico">
                                <Glyph name={sectionDefinition(found().key)?.icon ?? "link"} />
                            </span>
                            <span>
                                <b>{found().label}</b>
                                <small>{found().detail}</small>
                            </span>
                            <span class="plus">
                                <Glyph name="plus" />
                            </span>
                        </button>
                    )}
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

export function LookMini(props: { editor: EditorState }) {
    return (
        <span
            class="look-mini"
            style={{ "background-image": `url(${LOOK_TILES}${props.editor.page().look}.jpg)` }}
        />
    );
}
