import { lookNames } from "@tondo/page";
import type { LookName, Page } from "@tondo/page";
import { fontsHref, looks, renderBlock, renderCss, renderHeader } from "@tondo/render";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";
import { Thumbnail } from "./Thumbnail";

const TILE_WIDTH = 118;
const ASSETS = "/photos/";
const CTX = { assetBase: ASSETS, editable: false };

const PAINTS: readonly (readonly [label: string, palette: string[]])[] = [
    ["Madder", ["#c8385f", "#e8876a", "#a42a55", "#f2b56b"]],
    ["Sienna", ["#c9772f", "#e8a75d", "#b5562a", "#f2c98a"]],
    ["Sap", ["#4d7a2a", "#8aa83a", "#1f5c4a", "#d3a63a"]],
    ["Indigo", ["#1f3a93", "#2b5fb8", "#16245f", "#6c8fd6"]],
    ["Violet", ["#7a45b8", "#b69cf0", "#e7a9d8", "#8fa2f2"]],
];

const backgroundOf = (name: LookName) =>
    new RegExp(`--bg:(#[0-9a-f]{6})`).exec(looks[name].css)?.[1] ?? "#ffffff";

function moodOf(name: LookName): "light" | "dark" | "bold" {
    const hex = backgroundOf(name);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
    ];
    const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
    const spread = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (spread > 0.45 && lightness > 0.2) return "bold";
    return lightness < 0.4 ? "dark" : "light";
}

const FILTERS = [
    ["all", "All"],
    ["light", "Light"],
    ["dark", "Dark"],
    ["bold", "Bold"],
] as const;

// Fonts are only fetched for looks someone has scrolled to.
const fontsLoaded = new Set<string>();
function loadFonts(href: string) {
    if (fontsLoaded.has(href)) return;
    fontsLoaded.add(href);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
}

function LookTile(props: { name: LookName; editor: EditorState }) {
    const [seen, setSeen] = createSignal(false);
    const preview = (): Page => ({
        ...props.editor.page(),
        look: props.name,
        paint: undefined,
        seed: undefined,
    });
    const thumbnail = createMemo(() => {
        if (!seen()) return null;
        const page = preview();
        const blocks = page.blocks.filter((block) => block.type !== "tabs").slice(0, 3);
        return {
            html: `${renderHeader(page, CTX)}${blocks.map((block) => renderBlock(block, CTX)).join("")}`,
            css: renderCss({ ...page, blocks }),
        };
    });
    let observer: IntersectionObserver | undefined;
    onCleanup(() => observer?.disconnect());
    return (
        <button
            class="look-option"
            aria-pressed={props.editor.page().look === props.name}
            ref={(el) => {
                observer = new IntersectionObserver(
                    ([entry]) => {
                        if (!entry?.isIntersecting) return;
                        observer?.disconnect();
                        loadFonts(fontsHref(preview()));
                        setSeen(true);
                    },
                    { rootMargin: "240px" },
                );
                observer.observe(el);
            }}
            onClick={() => {
                props.editor.setLook(props.name);
            }}
        >
            <span class="lk-sample" style={{ background: backgroundOf(props.name) }}>
                <Show when={thumbnail()}>
                    {(drawn) => (
                        <Thumbnail
                            html={drawn().html}
                            css={drawn().css}
                            look={props.name}
                            width={TILE_WIDTH}
                        />
                    )}
                </Show>
            </span>
            {looks[props.name].label}
        </button>
    );
}

export function Looks(props: { editor: EditorState }) {
    const [filter, setFilter] = createSignal<(typeof FILTERS)[number][0]>("all");
    const shown = () => lookNames.filter((name) => filter() === "all" || moodOf(name) === filter());
    const paint = () => props.editor.page().paint?.join();
    return (
        <>
            <h2>Choose a look</h2>
            <p class="hint">Each one shows your own page. Click anything on it to edit.</p>
            <div class="lk-sws" role="group" aria-label="Paint colours">
                <button
                    class="lk-sw lk-sw-own"
                    aria-label="The look's own colours"
                    title="The look's own colours"
                    aria-pressed={!paint()}
                    onClick={() => {
                        props.editor.setPaint(undefined);
                    }}
                />
                <For each={PAINTS}>
                    {([label, palette]) => (
                        <button
                            class="lk-sw"
                            aria-label={label}
                            title={label}
                            aria-pressed={paint() === palette.join()}
                            style={{ background: palette[0] }}
                            onClick={() => {
                                props.editor.setPaint(palette);
                            }}
                        />
                    )}
                </For>
                <button
                    class="pill ghost wide lk-again"
                    onClick={() => {
                        props.editor.repaint();
                    }}
                >
                    <Icon name="brush" />
                    Paint it again
                </button>
            </div>
            <div class="lk-filters" role="group" aria-label="Show looks">
                <For each={FILTERS}>
                    {([id, label]) => (
                        <button
                            class="mini"
                            aria-pressed={filter() === id}
                            onClick={() => setFilter(id)}
                        >
                            {label}
                        </button>
                    )}
                </For>
            </div>
            <details class="i-sec page-settings">
                <summary>Page settings</summary>
                <label class="fd">
                    <div class="fd-l">
                        <span>Page title</span>
                    </div>
                    <input
                        class="in"
                        maxLength={70}
                        placeholder={props.editor.page().header.name}
                        value={props.editor.page().title ?? ""}
                        onInput={(e) => {
                            props.editor.setPageText("title", e.currentTarget.value);
                        }}
                    />
                </label>
                <label class="fd">
                    <div class="fd-l">
                        <span>Description</span>
                    </div>
                    <textarea
                        class="in"
                        maxLength={160}
                        rows="2"
                        value={props.editor.page().description ?? ""}
                        onInput={(e) => {
                            props.editor.setPageText("description", e.currentTarget.value);
                        }}
                    />
                    <small class="fd-h">Shows in browser tabs and when your link is shared.</small>
                </label>
            </details>
            <div class="look-list">
                <For each={shown()}>{(name) => <LookTile name={name} editor={props.editor} />}</For>
            </div>
        </>
    );
}
