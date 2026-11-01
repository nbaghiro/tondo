import { Show } from "solid-js";
import { logOut, pageUrl } from "../lib/account";
import type { Account } from "../lib/account";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

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
        <header class="top">
            <span class="brand">Tondo</span>
            <a
                class="address"
                href={pageUrl(props.account.handle)}
                target="_blank"
                rel="noreferrer"
            >
                tondo.page/{props.account.handle}
            </a>
            <span class="status" role="status" data-state={saver().state()}>
                {status()}
                <Show when={saver().state() === "conflict"}>
                    {" "}
                    <button
                        class="status-reload"
                        onClick={() => {
                            location.reload();
                        }}
                    >
                        Reload
                    </button>
                </Show>
            </span>
            <button
                class="round"
                aria-label="Undo"
                disabled={!props.editor.canUndo()}
                onClick={() => {
                    props.editor.undo();
                }}
            >
                <Icon name="undo" />
            </button>
            <button
                class="round"
                aria-label="Redo"
                disabled={!props.editor.canRedo()}
                onClick={() => {
                    props.editor.redo();
                }}
            >
                <Icon name="redo" />
            </button>
            <button
                class="preview-open"
                onClick={() => {
                    props.onPreview();
                }}
            >
                Preview
            </button>
            <button
                class="publish"
                disabled={props.publishing || !props.editor.changed()}
                onClick={() => {
                    props.onPublish();
                }}
            >
                {props.publishing ? "Publishing" : props.editor.changed() ? "Publish" : "Published"}
            </button>
            <button class="logout" onClick={logOut}>
                Log out
            </button>
        </header>
    );
}
