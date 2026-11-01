import { logOut } from "../lib/account";
import type { Account } from "../lib/account";
import type { EditorState } from "../state/document";
import { Icon } from "./Icon";

export function TopBar(props: { editor: EditorState; account: Account; onPreview: () => void }) {
    return (
        <header class="top">
            <span class="brand">Tondo</span>
            <span class="address">tondo.page/{props.account.handle}</span>
            <span class="status" role="status">
                {props.editor.saved()
                    ? "Saved in this browser"
                    : "Not saved: this page is too large for browser storage"}
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
            <button class="logout" onClick={logOut}>
                Log out
            </button>
        </header>
    );
}
