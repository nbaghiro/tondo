import "@tondo/brand/tokens.css";
import { render } from "solid-js/web";
import { Editor } from "./components/Editor";
import { FieldLab } from "./components/FieldLab";
import { loadAccount } from "./lib/account";
import "./styles/editor.css";

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root element.");

if (import.meta.env.DEV && location.search === "?fields") {
    render(() => <FieldLab />, root);
} else {
    // Null means the browser is already on its way to the login or claim page.
    loadAccount()
        .then((account) => {
            if (account) render(() => <Editor account={account} />, root);
        })
        .catch(() => {
            root.textContent =
                "We couldn't reach Tondo. Check your connection and reload this page.";
        });
}
