import "@tondo/brand/tokens.css";
import { render } from "solid-js/web";
import { Editor } from "./components/Editor";
import { BlockLab } from "./components/BlockLab";
import { FieldLab } from "./components/FieldLab";
import { loadAccount } from "./lib/account";
import { loadDraft } from "./lib/api";
import "./styles/editor.css";

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root element.");

if (import.meta.env.DEV && location.search === "?fields") {
    render(() => <FieldLab />, root);
} else if (import.meta.env.DEV && location.search === "?blocks") {
    render(() => <BlockLab />, root);
} else {
    // Null means the browser is already on its way to the login or claim page.
    loadAccount()
        .then(async (account) => {
            if (!account) return;
            const draft = await loadDraft();
            render(() => <Editor account={account} draft={draft} />, root);
        })
        .catch(() => {
            root.textContent =
                "We couldn't reach Tondo. Check your connection and reload this page.";
        });
}
