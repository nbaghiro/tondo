import type { Page } from "@tondo/page";
import { render } from "solid-js/web";
import { Editor } from "../components/Editor";
import { StartFlow } from "../components/StartFlow";
import { appPath, chosenPage } from "../lib/account";
import type { Account, LoadedAccount } from "../lib/account";
import { claimAddress, loadDraft, setPhotoPage } from "../lib/api";
import "../styles/fields.css";
import "../styles/builder.css";
import "../styles/help.css";

export async function mountEditor(root: HTMLElement, account: Account): Promise<void> {
    const chosen = chosenPage(account.pages);
    if (!chosen) throw new Error("The page couldn't be loaded.");
    setPhotoPage(chosen.id);
    const draft = await loadDraft(chosen.id);
    root.innerHTML = "";
    render(() => <Editor account={account} pageId={chosen.id} draft={draft} />, root);
}

export function mountStart(root: HTMLElement, _account: LoadedAccount): void {
    const wanted = new URLSearchParams(location.search).get("handle") ?? "";
    const finish = async (handle: string, page: Page) => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const problem = await claimAddress(handle, { ...page, timeZone });
        if (problem) return problem;
        location.assign(appPath("/edit"));
        return null;
    };
    render(() => <StartFlow wanted={wanted} onDone={finish} />, root);
}
