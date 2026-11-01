import { blockDefinitions, findBlock } from "@tondo/page";
import { createEffect, createSignal, Show } from "solid-js";
import { startDrag } from "../lib/drag";
import { blockNode } from "../lib/frame";
import { HEADER } from "../state/document";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

interface BlockActionsProps {
    editor: EditorState;
    frame: () => HTMLIFrameElement | undefined;
    layoutTick: () => number;
}

const EDGE = 8;

export function BlockActions(props: BlockActionsProps) {
    const [top, setTop] = createSignal(0);
    const [left, setLeft] = createSignal(0);
    const [bar, setBar] = createSignal<HTMLDivElement>();

    const id = () => {
        const selected = props.editor.selected();
        return selected && selected !== HEADER ? selected : null;
    };
    const found = () => findBlock(props.editor.page(), id() ?? "");
    const index = () => found()?.index ?? -1;
    const siblings = () => {
        const place = found()?.place;
        if (!place) return props.editor.page().blocks.length;
        const tabs = props.editor.page().blocks.find((block) => block.id === place.tabs);
        return tabs?.type === "tabs"
            ? (tabs.tabs.find((tab) => tab.id === place.tab)?.blocks.length ?? 0)
            : 0;
    };

    createEffect(() => {
        props.layoutTick();
        const frame = props.frame();
        const selected = id();
        const element = bar();
        if (!frame || !selected || !element) return;
        const node = blockNode(frame, selected);
        if (!node) return;
        const outer = frame.getBoundingClientRect();
        const inner = node.getBoundingClientRect();
        const wanted = outer.top + inner.top - element.offsetHeight / 2;
        setTop(
            Math.max(
                outer.top + EDGE,
                Math.min(outer.bottom - element.offsetHeight - EDGE, wanted),
            ),
        );
        setLeft(outer.left + Math.min(inner.right, frame.clientWidth) - element.offsetWidth - EDGE);
    });

    return (
        <Show when={id()} keyed>
            {(selected) => (
                <div
                    class="block-actions"
                    role="toolbar"
                    aria-label="Block actions"
                    ref={setBar}
                    style={{ top: `${top()}px`, left: `${left()}px` }}
                >
                    <button
                        class="grip"
                        aria-label="Drag to move"
                        onPointerDown={(e) => {
                            const frame = props.frame();
                            const block = found()?.block;
                            if (!frame || !block) return;
                            startDrag({
                                event: e,
                                source: e.currentTarget,
                                frame,
                                fromFrame: false,
                                label: blockDefinitions[block.type].name,
                                list: blockNode(frame, selected)?.parentElement?.closest(
                                    ".b-panel",
                                ),
                                onEnd: (to) => {
                                    if (to === null) return;
                                    const from = index();
                                    props.editor.move(selected, to > from ? to - 1 : to);
                                },
                            });
                        }}
                    >
                        <Icon name="grip" />
                    </button>
                    <button
                        aria-label="Move up"
                        disabled={index() <= 0}
                        onClick={() => {
                            props.editor.move(selected, index() - 1);
                        }}
                    >
                        <Icon name="up" />
                    </button>
                    <button
                        aria-label="Move down"
                        disabled={index() >= siblings() - 1}
                        onClick={() => {
                            props.editor.move(selected, index() + 1);
                        }}
                    >
                        <Icon name="down" />
                    </button>
                    <button
                        aria-label="Duplicate"
                        onClick={() => {
                            props.editor.duplicate(selected);
                        }}
                    >
                        <Icon name="copy" />
                    </button>
                    <button
                        aria-label="Delete"
                        onClick={() => {
                            props.editor.remove(selected);
                        }}
                    >
                        <Icon name="trash" />
                    </button>
                </div>
            )}
        </Show>
    );
}
