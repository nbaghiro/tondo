import { lookNames } from "@tondo/page";
import { looks } from "@tondo/render";
import { For } from "solid-js";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

export function Looks(props: { editor: EditorState }) {
    return (
        <>
            <h2>Choose a look</h2>
            <p class="hint">Click anything on your page to change it.</p>
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
