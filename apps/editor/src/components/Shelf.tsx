import { availableBlockTypes, blockDefinitions } from "@tondo/page";
import { For } from "solid-js";
import { startDrag } from "../lib/drag";
import type { EditorState } from "../state/document";

interface ShelfProps {
    editor: EditorState;
    frame: () => HTMLIFrameElement | undefined;
    onAdded: () => void;
}

export function Shelf(props: ShelfProps) {
    return (
        <>
            <h2>Add a block</h2>
            <p class="hint">Click one, or drag it onto your page.</p>
            <div class="tiles">
                <For each={availableBlockTypes}>
                    {(type) => (
                        <button
                            class="tile"
                            onClick={() => {
                                props.editor.add(type);
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
                                    label: blockDefinitions[type].name,
                                    onEnd: (index) => {
                                        if (index !== null) props.editor.add(type, index);
                                    },
                                });
                            }}
                        >
                            {blockDefinitions[type].name}
                        </button>
                    )}
                </For>
            </div>
        </>
    );
}
