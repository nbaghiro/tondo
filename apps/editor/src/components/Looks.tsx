import { lookNames } from "@tondo/page";
import { looks } from "@tondo/render";
import { For } from "solid-js";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

// The colours and type are in the look's CSS, so the tile reads them from there.
function sampleStyle(css: string) {
    const read = (name: string) => new RegExp(`--${name}:([^;}]+)`).exec(css)?.[1] ?? "";
    return {
        background: read("bg"),
        color: read("fg"),
        "--sample-font": read("disp"),
        "--sample-btn": read("btn"),
        "--sample-radius": read("rb") || "999px",
    };
}

export function Looks(props: { editor: EditorState }) {
    return (
        <>
            <h2>Choose a look</h2>
            <p class="hint">Click anything on your page to edit it.</p>
            <div class="look-list">
                <For each={lookNames}>
                    {(name) => (
                        <button
                            class="look-option"
                            aria-pressed={props.editor.page().look === name}
                            onClick={() => {
                                props.editor.setLook(name);
                            }}
                        >
                            <span class="lk-sample" style={sampleStyle(looks[name].css)}>
                                <b>Aa</b>
                                <i />
                            </span>
                            {looks[name].label}
                        </button>
                    )}
                </For>
            </div>
            <button
                class="pill ghost wide"
                onClick={() => {
                    props.editor.repaint();
                }}
            >
                <Icon name="brush" />
                Paint it again
            </button>
        </>
    );
}
