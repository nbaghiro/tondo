import { availableBlockTypes, blockDefinitions } from "@tondo/page";
import type { BlockGroup, BlockType } from "@tondo/page";
import { renderCss } from "@tondo/render";
import { createMemo, createSignal, For, Show, untrack } from "solid-js";
import { startDrag } from "../lib/drag";
import type { EditorState } from "../state/document";
import { Thumbnail } from "./Thumbnail";

interface ShelfProps {
    editor: EditorState;
    frame: () => HTMLIFrameElement | undefined;
    onAdded: () => void;
}

const GROUPS: readonly (readonly [BlockGroup, string])[] = [
    ["actions", "Links"],
    ["words", "Words"],
    ["media", "Photos, video and music"],
    ["selling", "Selling and booking"],
    ["details", "Proof and details"],
];
const TILE = 118;
const CTX = { assetBase: "/photos/", editable: false };

function PasteBox(props: { editor: EditorState; onAdded: () => void }) {
    const [value, setValue] = createSignal("");
    const [error, setError] = createSignal("");
    return (
        <form
            class="paste"
            onSubmit={(e) => {
                e.preventDefault();
                if (!value().trim()) return;
                if (!props.editor.addFromLink(value())) {
                    setError("That doesn't look like a link, email or phone number yet.");
                    return;
                }
                setValue("");
                setError("");
                props.onAdded();
            }}
        >
            <label class="paste-box">
                <span class="sr">Paste a link</span>
                <input
                    placeholder="Paste a link"
                    value={value()}
                    onInput={(e) => {
                        setValue(e.currentTarget.value);
                        setError("");
                    }}
                />
                <button type="submit" disabled={!value().trim()}>
                    Add
                </button>
            </label>
            <Show when={error()}>
                <small role="alert">{error()}</small>
            </Show>
        </form>
    );
}

function Tile(props: ShelfProps & { type: BlockType }) {
    const definition = () => blockDefinitions[props.type];
    const sample = () => ({ id: "shelf", ...definition().make() });
    // Only the look matters here, so typing on the page doesn't redraw every tile.
    const look = createMemo(() => props.editor.page().look);
    const css = createMemo(() => {
        const name = look();
        const page = untrack(() => props.editor.page());
        return `${renderCss({ ...page, look: name, blocks: [] })}\n${definition().css}`;
    });
    return (
        <button
            class="tile"
            aria-label={definition().name}
            onClick={() => {
                props.editor.add(props.type);
                props.onAdded();
            }}
            onPointerDown={(e) => {
                const frame = props.frame();
                if (!frame || e.pointerType !== "mouse") return;
                startDrag({
                    event: e,
                    source: e.currentTarget,
                    frame,
                    fromFrame: false,
                    label: definition().name,
                    onEnd: (index) => {
                        if (index !== null) props.editor.add(props.type, index);
                    },
                });
            }}
        >
            <span class="tile-in">
                <Thumbnail
                    html={definition().draw(sample(), CTX)}
                    css={css()}
                    look={look()}
                    width={TILE}
                    short
                />
            </span>
            {definition().name}
        </button>
    );
}

export function Shelf(props: ShelfProps) {
    return (
        <>
            <h2>Add a block</h2>
            <p class="hint">Click one, or drag it onto your page.</p>
            <PasteBox editor={props.editor} onAdded={props.onAdded} />
            <For each={GROUPS}>
                {([group, name]) => (
                    <section class="shelf-group">
                        <h3>{name}</h3>
                        <div class="tiles">
                            <For
                                each={availableBlockTypes.filter(
                                    (type) => blockDefinitions[type].group === group,
                                )}
                            >
                                {(type) => (
                                    <Tile
                                        type={type}
                                        editor={props.editor}
                                        frame={props.frame}
                                        onAdded={props.onAdded}
                                    />
                                )}
                            </For>
                        </div>
                    </section>
                )}
            </For>
        </>
    );
}
