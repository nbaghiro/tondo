import { Show } from "solid-js";
import { appPath, pageUrl } from "../lib/account";
import type { Account } from "../lib/account";
import type { EditorState } from "../state/document";
import { downloadPage } from "../state/storage";
import { paint } from "@tondo/render";
import { Glyph } from "./Panels";

const LOGO = paint(["#c8385f", "#e8876a", "#a42a55", "#f2b56b"], 9).replace('class="tondo"', "");

interface TopBarProps {
    editor: EditorState;
    account: Account;
    onPreview: () => void;
    onPublish: () => void;
    publishing: boolean;
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
                <a class="tlogo tohome" href={appPath("/")} aria-label="Back to Home">
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
                    href={pageUrl(props.account.handle)}
                    target="_blank"
                    rel="noreferrer"
                >
                    tondo.page/<b>{props.account.handle}</b>
                </a>
            </div>
            <div class="tgroup tr">
                <span class="saved status" role="status" data-state={saver().state()}>
                    {status()}
                    <Show when={saver().state() === "conflict"}>
                        {" "}
                        <button
                            class="status-reload"
                            onClick={() => {
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
                                downloadPage(props.editor.page(), props.account.handle);
                            }}
                        >
                            Download mine
                        </button>
                    </Show>
                </span>
                <button
                    class="circle"
                    aria-label="Undo"
                    disabled={!props.editor.canUndo()}
                    onClick={() => {
                        props.editor.undo();
                    }}
                >
                    <Glyph name="undo" />
                </button>
                <button
                    class="circle"
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
                    disabled={props.publishing || !props.editor.changed()}
                    onClick={() => {
                        props.onPublish();
                    }}
                >
                    {props.publishing
                        ? "Publishing"
                        : props.editor.changed()
                          ? "Publish"
                          : "Published"}
                </button>
            </div>
        </header>
    );
}
