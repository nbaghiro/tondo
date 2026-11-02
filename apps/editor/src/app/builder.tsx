import { canAddPage } from "@tondo/page";
import type { Page } from "@tondo/page";
import { render } from "solid-js/web";
import { Editor } from "../components/Editor";
import { StartFlow } from "../components/StartFlow";
import { appPath, chosenPage, newPageOrigin, onPage, ownPageCount } from "../lib/account";
import type { Account, LoadedAccount } from "../lib/account";
import { claimAddress, createPage, loadDraft, setPhotoPage } from "../lib/api";
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

const withTimeZone = (page: Page): Page => ({
    ...page,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

export function mountStart(root: HTMLElement, _account: LoadedAccount): void {
    const wanted = new URLSearchParams(location.search).get("handle") ?? "";
    const finish = async (handle: string, page: Page) => {
        const problem = await claimAddress(handle, withTimeZone(page));
        if (problem) return problem;
        location.assign(appPath("/edit"));
        return null;
    };
    render(() => <StartFlow wanted={wanted} onDone={finish} />, root);
}

/** The start flow for a person who has pages. Only New page opens it, and only under the limit. */
export function mountNewPage(root: HTMLElement, account: Account): void {
    const origin = newPageOrigin(account.pages);
    if (!origin) {
        location.replace(appPath("/"));
        return;
    }
    if (!canAddPage(account.limits, ownPageCount(account.pages))) {
        location.replace(appPath(onPage("/?limit=1", origin.pageId)));
        return;
    }
    document.title = "New page | Tondo";
    const finish = async (handle: string, page: Page) => {
        const made = await createPage({ handle, page: withTimeZone(page) });
        if ("error" in made) return made.error;
        // Replacing means Back from the builder doesn't walk into the flow again.
        location.replace(appPath(onPage("/edit", made.id)));
        return null;
    };
    const leave = {
        href: appPath(onPage(origin.screen, origin.pageId)),
        pageName: account.pages.find((page) => page.id === origin.pageId)?.name ?? "",
    };
    render(() => <StartFlow wanted="" onDone={finish} leave={leave} />, root);
}
