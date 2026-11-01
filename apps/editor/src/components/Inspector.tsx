import {
    allBlocks,
    blockDefinitions,
    findBlock,
    headerFields,
    headerLayoutLabels,
    headerLayouts,
    MAX_HIGHLIGHTS,
} from "@tondo/page";
import type { Block, BlockValues, Field, Page } from "@tondo/page";
import { renderCss, renderHeader } from "@tondo/render";
import { createMemo, For, onMount, Show } from "solid-js";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import { FieldView, SourceInput, Toggle } from "./Fields";
import { Icon } from "./Icon";
import { Thumbnail } from "./Thumbnail";

const ASSETS = "/photos/";
const THUMB_CTX = { assetBase: ASSETS, editable: false };
const TILE = 96;

interface LayoutOption {
    id: string;
    label: string;
    html: string;
    css: string;
    short: boolean;
}

function LayoutPicker(props: {
    look: string;
    options: LayoutOption[];
    current: string;
    onPick: (id: string) => void;
}) {
    return (
        <section class="i-sec">
            <h3>Layout</h3>
            <div class="vars" role="radiogroup" aria-label="Layout">
                <For each={props.options}>
                    {(option) => (
                        <button
                            type="button"
                            role="radio"
                            class="var"
                            aria-checked={props.current === option.id}
                            classList={{ on: props.current === option.id }}
                            onClick={() => {
                                props.onPick(option.id);
                            }}
                        >
                            <span class="var-in">
                                <Thumbnail
                                    html={option.html}
                                    css={option.css}
                                    look={props.look}
                                    width={TILE}
                                    short={option.short}
                                />
                            </span>
                            {option.label}
                        </button>
                    )}
                </For>
            </div>
        </section>
    );
}

function blockLayouts(page: Page, block: Block): LayoutOption[] {
    const definition = blockDefinitions[block.type];
    const css = renderCss({ ...page, blocks: [block] });
    return Object.entries(definition.layouts)
        .filter(([, layout]) => !layout.held)
        .map(([id, layout]) => ({
            id,
            label: layout.label,
            html: definition.draw({ ...block, variant: id }, THUMB_CTX),
            css,
            short: true,
        }));
}

function headerLayoutOptions(page: Page): LayoutOption[] {
    const css = renderCss({ ...page, blocks: [] });
    return headerLayouts.map((id) => ({
        id,
        label: headerLayoutLabels[id],
        html: renderHeader({ ...page, header: { ...page.header, layout: id } }, THUMB_CTX),
        css,
        short: false,
    }));
}

const hasContent = (values: BlockValues, field: Field) => !field.when || field.when(values);

function ShowOrHide(props: { editor: EditorState; block: Block }) {
    const id = () => props.block.id;
    const set = (key: string, value: unknown) => props.editor.setField(id(), key, value);
    const others = () =>
        allBlocks(props.editor.page().blocks).filter(
            (block) => block.highlight && block.id !== id(),
        ).length;
    const atLimit = () => others() >= MAX_HIGHLIGHTS && !props.block.highlight;
    const summary = () => {
        const { hidden, showFrom, showUntil, highlight } = props.block;
        const states = [
            hidden ? "Hidden" : "",
            showFrom || showUntil ? "Scheduled" : "",
            highlight ? "Highlighted" : "",
        ];
        return states.filter(Boolean).join(", ");
    };
    return (
        <details class="i-sec" open={Boolean(summary())}>
            <summary>
                Show or hide
                <small>{summary()}</small>
            </summary>
            <Toggle
                label="Show on my page"
                checked={!props.block.hidden}
                onChange={(checked) => {
                    set("hidden", !checked);
                }}
            />
            <FieldView
                assets={ASSETS}
                field={{ kind: "dateTime", key: "showFrom", label: "Show from" }}
                values={() => props.block}
                set={set}
            />
            <FieldView
                assets={ASSETS}
                field={{ kind: "dateTime", key: "showUntil", label: "Show until" }}
                values={() => props.block}
                set={set}
            />
            <Toggle
                label="Highlight"
                checked={Boolean(props.block.highlight)}
                disabled={atLimit()}
                hint={
                    atLimit()
                        ? "Two highlights is the most a page can have, so they still stand out."
                        : undefined
                }
                onChange={(checked) => {
                    set("highlight", checked);
                }}
            />
        </details>
    );
}

export function Inspector(props: { editor: EditorState; onClose: () => void; onAdd: () => void }) {
    const target = () => props.editor.selected() ?? "";
    const isHeader = () => target() === HEADER;
    const block = () => findBlock(props.editor.page(), target())?.block;
    const values = (): BlockValues => (isHeader() ? props.editor.page().header : (block() ?? {}));
    const definition = () => {
        const current = block();
        return current ? blockDefinitions[current.type] : null;
    };
    const defaults = createMemo(() => definition()?.make());
    const fields = () => (isHeader() ? headerFields : (definition()?.fields ?? []));
    const shown = (more: boolean) =>
        fields().filter(
            (f) => f.kind !== "source" && Boolean(f.more) === more && hasContent(values(), f),
        );
    // A source with one real choice isn't a choice, so it stays out of the panel.
    const source = () => {
        const found = fields().find((f) => f.kind === "source");
        return found?.kind === "source" && found.options.filter((o) => !o.held).length > 1
            ? found
            : null;
    };
    const set = (key: string, value: unknown) => props.editor.setField(target(), key, value);
    const layouts = () => {
        const page = props.editor.page();
        const current = block();
        if (isHeader()) return headerLayoutOptions(page);
        return current ? blockLayouts(page, current) : [];
    };
    const currentLayout = () => {
        const current = block();
        return isHeader() ? props.editor.page().header.layout : (current?.variant ?? "");
    };
    let body: HTMLDivElement | undefined;

    // A new block's first field gets focus on a computer. On a phone the keyboard would cover the
    // layouts, so it waits to be tapped.
    onMount(() => {
        if (!props.editor.takeJustAdded()) return;
        if (!window.matchMedia("(pointer: fine)").matches) return;
        body?.querySelector<HTMLElement>("input.in, textarea.in")?.focus();
    });

    return (
        <>
            <header class="i-head">
                <h2>{isHeader() ? "Header" : (definition()?.name ?? "")}</h2>
                <button
                    type="button"
                    class="i-add"
                    onClick={() => {
                        props.onAdd();
                    }}
                >
                    Add
                </button>
                <button
                    type="button"
                    class="icon-b"
                    aria-label="Close"
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    <Icon name="close" />
                </button>
            </header>
            <div
                class="i-body"
                ref={(el) => {
                    body = el;
                }}
            >
                <Show when={source()}>
                    {(field) => (
                        <section class="i-sec">
                            <h3>{field().label}</h3>
                            <SourceInput
                                assets={ASSETS}
                                field={field()}
                                values={values}
                                set={set}
                            />
                        </section>
                    )}
                </Show>
                <Show when={layouts().length > 1}>
                    <LayoutPicker
                        look={props.editor.page().look}
                        options={layouts()}
                        current={currentLayout()}
                        onPick={(id) => {
                            set(isHeader() ? "layout" : "variant", id);
                        }}
                    />
                </Show>
                <section class="i-sec">
                    <For each={shown(false)}>
                        {(field) => (
                            <FieldView
                                assets={ASSETS}
                                field={field}
                                values={values}
                                set={set}
                                defaults={defaults()}
                            />
                        )}
                    </For>
                </section>
                <Show when={shown(true).length}>
                    <details class="i-sec">
                        <summary>More options</summary>
                        <For each={shown(true)}>
                            {(field) => (
                                <FieldView
                                    assets={ASSETS}
                                    field={field}
                                    values={values}
                                    set={set}
                                />
                            )}
                        </For>
                    </details>
                </Show>
                <Show when={block()}>
                    {(current) => <ShowOrHide editor={props.editor} block={current()} />}
                </Show>
            </div>
        </>
    );
}
