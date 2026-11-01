import "@tondo/brand/tokens.css";
import { render } from "solid-js/web";
import { Editor } from "./components/Editor";
import { BlockLab } from "./components/BlockLab";
import { FieldLab } from "./components/FieldLab";
import { StartFlow } from "./components/StartFlow";
import { loadAccount } from "./lib/account";
import type { Account } from "./lib/account";
import { claimAddress, loadDraft } from "./lib/api";
import type { Page } from "@tondo/page";
import "./styles/fields.css";
import "./styles/builder.css";

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root element.");

if (import.meta.env.DEV && location.search === "?fields") {
    render(() => <FieldLab />, root);
} else if (import.meta.env.DEV && location.search === "?blocks") {
    render(() => <BlockLab />, root);
} else {
    const openEditor = async (account: Account) => {
        const draft = await loadDraft();
        root.innerHTML = "";
        render(() => <Editor account={account} draft={draft} />, root);
    };
    // Null means the browser is already on its way to the login page.
    loadAccount()
        .then(async (account) => {
            if (!account) return;
            if (account.handle) {
                await openEditor({ ...account, handle: account.handle });
                return;
            }
            const wanted = new URLSearchParams(location.search).get("handle") ?? "";
            const finish = async (handle: string, page: Page) => {
                const problem = await claimAddress(handle, page);
                if (problem) return problem;
                dispose();
                history.replaceState(null, "", location.pathname);
                await openEditor({ ...account, handle });
                return null;
            };
            const dispose = render(() => <StartFlow wanted={wanted} onDone={finish} />, root);
        })
        .catch(() => {
            root.textContent =
                "We couldn't reach Tondo. Check your connection and reload this page.";
        });
}
