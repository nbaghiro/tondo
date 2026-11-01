import {
    allBlocks,
    blockDefinitions,
    findSection,
    headerFields,
    headerLayoutLabels,
    headerLayouts,
    MAX_HIGHLIGHTS,
    sectionStatus,
    styleAvailable,
    wordmarks,
} from "@tondo/page";
import type { Block, BlockValues, Field, Section } from "@tondo/page";
import { createEffect, createSignal, For, onMount, Show, untrack } from "solid-js";
import { wireHtml } from "../lib/drawings";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import { askedItem, FieldView, SourceInput, Toggle } from "./Fields";
import { Glyph } from "./Panels";

const ASSETS = "/photos/";
const applies = (values: BlockValues, field: Field) => !field.when || field.when(values);

function BlockFields(props: { editor: EditorState; block: () => Block; more: boolean }) {
    const definition = () => blockDefinitions[props.block().type];
    const values = (): BlockValues => props.block();
    const set = (key: string, value: unknown) =>
        props.editor.setField(props.block().id, key, value);
    const fields = () =>
        definition().fields.filter(
            (field) =>
                field.kind !== "source" &&
                Boolean(field.more) === props.more &&
                applies(values(), field),
        );
    const source = () => {
        if (props.more) return null;
        const found = definition().fields.find((field) => field.kind === "source");
        return found?.kind === "source" && found.options.filter((o) => !o.held).length > 1
            ? found
            : null;
    };
    return (
        <>
            <Show when={source()}>
                {(field) => (
                    <SourceInput assets={ASSETS} field={field()} values={values} set={set} />
                )}
            </Show>
            <For each={fields()}>
                {(field) => (
                    <FieldView
                        assets={ASSETS}
                        field={field}
                        values={values}
                        set={set}
                        defaults={definition().make()}
                    />
                )}
            </For>
        </>
    );
}

function LinkList(props: { editor: EditorState; section: () => Section }) {
    const [open, setOpen] = createSignal<string | null>(
        untrack(() => props.section().blocks[0]?.id ?? null),
    );
    createEffect(() => {
        const asked = askedItem();
        if (asked && props.section().blocks.some((block) => block.id === asked)) setOpen(asked);
    });
    const label = (block: Block) =>
        block.type === "button" ? block.text : block.type === "link-card" ? block.title : "Link";
    return (
        <div class="fd">
            <span class="fd-l">
                <span>Links</span>
            </span>
            <div class="link-items">
                <For each={props.section().blocks}>
                    {(block, index) => (
                        <div
                            class="item"
                            data-ask={block.id}
                            classList={{ on: open() === block.id }}
                        >
                            <div class="item-h">
                                <button
                                    type="button"
                                    class="item-open"
                                    aria-expanded={open() === block.id}
                                    onClick={() => setOpen(open() === block.id ? null : block.id)}
                                >
                                    {label(block) || "Link"}
                                </button>
                                <button
                                    type="button"
                                    class="tb"
                                    aria-label="Move this link up"
                                    disabled={index() === 0}
                                    onClick={() => {
                                        props.editor.moveLink(block.id, -1);
                                    }}
                                >
                                    <Glyph name="up" />
                                </button>
                                <button
                                    type="button"
                                    class="tb"
                                    aria-label="Move this link down"
                                    disabled={index() === props.section().blocks.length - 1}
                                    onClick={() => {
                                        props.editor.moveLink(block.id, 1);
                                    }}
                                >
                                    <Glyph name="down2" />
                                </button>
                                <button
                                    type="button"
                                    class="tb"
                                    aria-label="Remove this link"
                                    onClick={() => {
                                        props.editor.removeLink(props.section().id, block.id);
                                    }}
                                >
                                    <Glyph name="x" />
                                </button>
                            </div>
                            <Show when={open() === block.id}>
                                <div class="item-b">
                                    <BlockFields
                                        editor={props.editor}
                                        more={false}
                                        block={() =>
                                            props.section().blocks.find((b) => b.id === block.id) ??
                                            block
                                        }
                                    />
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
            </div>
            <button
                type="button"
                class="ls-add"
                onClick={() => {
                    props.editor.addLink(props.section().id);
                }}
            >
                Add a link
            </button>
        </div>
    );
}

function Timing(props: { editor: EditorState; section: () => Section }) {
    const first = () => props.section().blocks[0];
    const id = () => props.section().id;
    const set = (key: "showFrom" | "showUntil", value: unknown) => {
        props.editor.setShared(id(), key, value);
        return true;
    };
    const othersHighlighted = () =>
        allBlocks(props.editor.page().blocks).filter(
            (block) => block.highlight && block.id !== first()?.id,
        ).length;
    const atLimit = () => othersHighlighted() >= MAX_HIGHLIGHTS && !first()?.highlight;
    return (
        <>
            <Toggle
                label="Show on my page"
                checked={!first()?.hidden}
                onChange={(checked) => {
                    props.editor.setShared(id(), "hidden", !checked);
                }}
            />
            <FieldView
                assets={ASSETS}
                field={{ kind: "dateTime", key: "showFrom", label: "Show from" }}
                values={() => first() ?? {}}
                set={(_key, value) => set("showFrom", value)}
            />
            <FieldView
                assets={ASSETS}
                field={{ kind: "dateTime", key: "showUntil", label: "Show until" }}
                values={() => first() ?? {}}
                set={(_key, value) => set("showUntil", value)}
            />
            <Toggle
                label="Stand out"
                checked={Boolean(first()?.highlight)}
                disabled={atLimit()}
                hint={
                    atLimit()
                        ? "Two is the most a page can have, so they still stand out."
                        : undefined
                }
                onChange={(checked) => {
                    const block = first();
                    if (block) props.editor.setField(block.id, "highlight", checked);
                }}
            />
        </>
    );
}

export function SectionPanel(props: { editor: EditorState; id: string }) {
    const found = () => findSection(props.editor.page(), props.id);
    const section = () => found()?.section;
    const [body, setBody] = createSignal<HTMLDivElement>();

    // A new section's first field gets focus on a computer. On a phone the keyboard would cover the
    // page, so it waits to be tapped.
    onMount(() => {
        if (!props.editor.takeJustAdded()) return;
        if (!window.matchMedia("(pointer: fine)").matches) return;
        // The title sits below the style tiles and items, and focus would scroll them away.
        body()
            ?.querySelector<HTMLElement>("input.in:not([data-title]), textarea.in")
            ?.focus({ preventScroll: true });
    });

    return (
        <Show when={section()} keyed>
            {(current) => {
                const live = () => section() ?? current;
                const def = () => live().definition;
                const style = () => live().style;
                const noTitle = () => def().key === "banner" || def().key === "space";
                const first = () => live().blocks[0];
                return (
                    <div ref={setBody}>
                        <Show when={sectionStatus(live())}>
                            {(status) => <p class="where todo-note">{status()}</p>}
                        </Show>
                        <Show when={def().styles.length > 1}>
                            <div class="styles" role="radiogroup" aria-label="Style">
                                <For each={def().styles}>
                                    {(option) => (
                                        <button
                                            type="button"
                                            class="st"
                                            role="radio"
                                            data-style={option.id}
                                            aria-checked={style().id === option.id}
                                            disabled={!styleAvailable(option)}
                                            onClick={() => {
                                                props.editor.setSectionStyle(live().id, option.id);
                                            }}
                                        >
                                            <span
                                                ref={(el) => {
                                                    el.innerHTML = wireHtml(option.wire);
                                                }}
                                            />
                                            {option.label}
                                            <Show when={!styleAvailable(option)}>
                                                <em>Soon</em>
                                            </Show>
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Show when={!noTitle()}>
                            <Toggle
                                label="Tinted background"
                                checked={Boolean(first()?.tint)}
                                onChange={(checked) => {
                                    props.editor.setShared(live().id, "tint", checked);
                                }}
                            />
                        </Show>
                        <Show
                            when={def().key === "links"}
                            fallback={
                                <For each={live().blocks}>
                                    {(block) => (
                                        <BlockFields
                                            editor={props.editor}
                                            more={false}
                                            block={() =>
                                                live().blocks.find((b) => b.id === block.id) ??
                                                block
                                            }
                                        />
                                    )}
                                </For>
                            }
                        >
                            <LinkList editor={props.editor} section={live} />
                        </Show>
                        <Show when={!noTitle()}>
                            <label class="fd">
                                <span class="fd-l">
                                    <span>Title above it (optional)</span>
                                </span>
                                <input
                                    class="in"
                                    data-title
                                    maxLength={60}
                                    value={live().title?.text ?? ""}
                                    onInput={(e) => {
                                        props.editor.setSectionTitle(
                                            live().id,
                                            e.currentTarget.value,
                                        );
                                    }}
                                />
                            </label>
                        </Show>
                        <details class="more">
                            <summary>More options</summary>
                            <Show when={style().options}>
                                {(options) => (
                                    <div class="fd">
                                        <span class="fd-l">
                                            <span>{options().label}</span>
                                        </span>
                                        <div class="chips">
                                            <For each={options().choices}>
                                                {([variant, label]) => (
                                                    <button
                                                        type="button"
                                                        class="chip"
                                                        aria-pressed={first()?.variant === variant}
                                                        onClick={() => {
                                                            const block = first();
                                                            if (block) {
                                                                props.editor.setField(
                                                                    block.id,
                                                                    "variant",
                                                                    variant,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {label}
                                                    </button>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                )}
                            </Show>
                            <For
                                each={live().blocks.slice(0, def().key === "links" ? 0 : undefined)}
                            >
                                {(block) => (
                                    <BlockFields
                                        editor={props.editor}
                                        more={true}
                                        block={() =>
                                            live().blocks.find((b) => b.id === block.id) ?? block
                                        }
                                    />
                                )}
                            </For>
                            <Show when={live().title}>
                                <Toggle
                                    label="Big title"
                                    checked={live().title?.variant === "large"}
                                    onChange={(checked) => {
                                        props.editor.setBigTitle(live().id, checked);
                                    }}
                                />
                            </Show>
                            <Timing editor={props.editor} section={live} />
                        </details>
                        <button
                            type="button"
                            class="danger"
                            onClick={() => {
                                props.editor.remove(live().id);
                            }}
                        >
                            Remove this section
                        </button>
                    </div>
                );
            }}
        </Show>
    );
}

const WORDMARK_LABELS: Record<(typeof wordmarks)[number], string> = {
    bubble: "Bubble",
    poster: "Poster",
    script: "Script",
    paint: "Painted",
    seal: "Seal",
};

export function HeaderPanel(props: { editor: EditorState; socialAsked: number }) {
    const values = (): BlockValues => props.editor.page().header;
    const set = (key: string, value: unknown) => props.editor.setField(HEADER, key, value);
    const shown = (more: boolean) =>
        headerFields.filter(
            (field) =>
                field.key !== "links" && Boolean(field.more) === more && applies(values(), field),
        );
    const socialField = headerFields.find((field) => field.key === "links");
    const [socialRow, setSocialRow] = createSignal<HTMLDivElement>();
    // Tapping the icons on the page comes straight here.
    createEffect(() => {
        if (props.socialAsked) socialRow()?.scrollIntoView({ block: "start" });
    });
    return (
        <>
            <div class="fd">
                <span class="fd-l">
                    <span>Layout</span>
                </span>
                <div class="chips">
                    <For each={headerLayouts}>
                        {(id) => (
                            <button
                                type="button"
                                class="chip"
                                data-layout={id}
                                aria-pressed={props.editor.page().header.layout === id}
                                onClick={() => {
                                    set("layout", id);
                                }}
                            >
                                {headerLayoutLabels[id]}
                            </button>
                        )}
                    </For>
                </div>
            </div>
            <For each={shown(false)}>
                {(field) => <FieldView assets={ASSETS} field={field} values={values} set={set} />}
            </For>
            <Show when={socialField}>
                {(field) => (
                    <div class="social-row" id="social-icons" ref={setSocialRow}>
                        <FieldView assets={ASSETS} field={field()} values={values} set={set} />
                    </div>
                )}
            </Show>
            <div class="fd">
                <span class="fd-l">
                    <span>A logo from your name</span>
                </span>
                <div class="chips">
                    <button
                        type="button"
                        class="chip"
                        aria-pressed={!props.editor.page().header.wordmark}
                        onClick={() => {
                            set("wordmark", undefined);
                        }}
                    >
                        Plain text
                    </button>
                    <For each={wordmarks}>
                        {(id) => (
                            <button
                                type="button"
                                class="chip"
                                data-mark={id}
                                aria-pressed={props.editor.page().header.wordmark === id}
                                onClick={() => {
                                    set("wordmark", id);
                                }}
                            >
                                {WORDMARK_LABELS[id]}
                            </button>
                        )}
                    </For>
                </div>
            </div>
            <details class="more">
                <summary>More options</summary>
                <For each={shown(true)}>
                    {(field) => (
                        <FieldView assets={ASSETS} field={field} values={values} set={set} />
                    )}
                </For>
                <label class="fd">
                    <span class="fd-l">
                        <span>Page title, for browser tabs and shared links</span>
                    </span>
                    <input
                        class="in"
                        maxLength={70}
                        value={props.editor.page().title ?? ""}
                        onInput={(e) => {
                            props.editor.setPageText("title", e.currentTarget.value);
                        }}
                    />
                </label>
                <label class="fd">
                    <span class="fd-l">
                        <span>Short description, for shared links</span>
                    </span>
                    <textarea
                        class="in"
                        rows="2"
                        maxLength={160}
                        value={props.editor.page().description ?? ""}
                        onInput={(e) => {
                            props.editor.setPageText("description", e.currentTarget.value);
                        }}
                    />
                </label>
            </details>
        </>
    );
}
