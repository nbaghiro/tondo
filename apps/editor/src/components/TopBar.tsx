import { Show } from "solid-js";
import { appPath, onPage, pageUrl } from "../lib/account";
import type { EditorState } from "../state/document";
import { clearBackup, downloadPage } from "../state/storage";
import { paint } from "@tondo/render";
import { Glyph } from "./Panels";

const LOGO = paint(["#c8385f", "#e8876a", "#a42a55", "#f2b56b"], 9).replace('class="tondo"', "");

interface TopBarProps {
    editor: EditorState;
    pageId: string;
    handle: string;
    onPreview: () => void;
    onPublish: () => void;
    /** Left out when Help me isn't set up here. */
    onHelp?: (() => void) | undefined;
    helping: boolean;
    publishing: boolean;
    /** Taken down for breaking the rules. Pressing Publish explains why. */
    suspended: boolean;
    /** Only while the left panel is closed into this bar. */
    onOpenPanel?: (() => void) | undefined;
}

const STATUS = {
    saved: "Saved",
    saving: "Saving",
    retrying: "Not saved yet: trying again, and your work is safe in this browser",
    conflict: "This page changed somewhere else.",
} as const;

export function TopBar(props: TopBarProps) {
    const saver = () => props.editor.saver;
    const status = () => {
        const state = saver().state();
        return state === "refused" ? saver().message() : STATUS[state];
    };
    return (
        <header class="topbar">
            <div class="tgroup tl">
                <a
                    class="tlogo tohome"
                    href={appPath(onPage("/", props.pageId))}
                    aria-label="Back to Home"
                    onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                        e.preventDefault();
                        // Home shows what the server has, so this tab's edits go there first.
                        const go = () => {
                            location.assign(appPath(onPage("/", props.pageId)));
                        };
                        saver().flush().then(go, go);
                    }}
                >
                    <i
                        ref={(el) => {
                            el.innerHTML = LOGO;
                        }}
                    />
                    <span class="tohome-word">Tondo</span>
                    <small class="tohome-back">Home</small>
                </a>
                <a
                    class="url address"
                    href={pageUrl(props.handle)}
                    target="_blank"
                    rel="noreferrer"
                >
                    tondo.page/<b>{props.handle}</b>
                </a>
                <Show when={props.onOpenPanel}>
                    <button
                        type="button"
                        class="circle panel-open"
                        id="panel-open"
                        aria-label="Open your page panel"
                        title="Open your page panel"
                        onClick={() => {
                            props.onOpenPanel?.();
                        }}
                    >
                        <Glyph name="list" />
                    </button>
                </Show>
            </div>
            <div class="tgroup tr">
                <span class="saved status" role="status" data-state={saver().state()}>
                    {status()}
                    <Show when={saver().state() === "conflict"}>
                        {" "}
                        <button
                            class="status-reload"
                            onClick={() => {
                                // Choosing the latest means this tab's copy isn't wanted any more.
                                clearBackup(props.pageId);
                                location.reload();
                            }}
                        >
                            Use the latest
                        </button>{" "}
                        <button
                            class="status-reload"
                            onClick={() => {
                                saver()
                                    .keepMine(props.editor.page())
                                    .catch(() => undefined);
                            }}
                        >
                            Keep mine
                        </button>{" "}
                        <button
                            class="status-reload"
                            onClick={() => {
                                downloadPage(props.editor.page(), props.handle);
                            }}
                        >
                            Download mine
                        </button>
                    </Show>
                </span>
                <Show when={props.onHelp}>
                    <button
                        class="helpme"
                        aria-pressed={props.helping}
                        onClick={() => {
                            props.onHelp?.();
                        }}
                    >
                        <Glyph name="spark" />
                        Help me
                    </button>
                </Show>
                <button
                    class="circle undo-redo"
                    aria-label="Undo"
                    disabled={!props.editor.canUndo()}
                    onClick={() => {
                        props.editor.undo();
                    }}
                >
                    <Glyph name="undo" />
                </button>
                <button
                    class="circle undo-redo"
                    aria-label="Redo"
                    disabled={!props.editor.canRedo()}
                    onClick={() => {
                        props.editor.redo();
                    }}
                >
                    <Glyph name="redo" />
                </button>
                <button
                    class="prev preview-open"
                    onClick={() => {
                        props.onPreview();
                    }}
                >
                    Preview
                </button>
                <button
                    class="pub-go publish"
                    disabled={
                        props.publishing ||
                        props.editor.locked() ||
                        (!props.editor.changed() && !props.suspended)
                    }
                    onClick={() => {
                        props.onPublish();
                    }}
                >
                    {props.publishing
                        ? "Publishing"
                        : props.suspended
                          ? "Taken down"
                          : props.editor.changed()
                            ? "Publish"
                            : "Published"}
                </button>
            </div>
        </header>
    );
}
