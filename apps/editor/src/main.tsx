import "@tondo/brand/tokens.css";
import { inAppPath } from "./app/router";
import { appPath, followLogOut, loadAccount, UNREACHABLE } from "./lib/account";
import { setPlan } from "./state/plan";

const root = document.getElementById("root");
if (!root) throw new Error("The page has no #root element.");

// The builder and the dashboard load separately, so neither carries the other's code or styles.
async function open(here: HTMLElement): Promise<void> {
    // Null means the browser is already on its way to the login page.
    const account = await loadAccount();
    if (!account) return;
    setPlan(account);
    followLogOut();
    const path = inAppPath();
    if (!account.pages.length) {
        if (path !== "/start") {
            location.replace(`${appPath("/start")}${location.search}`);
            return;
        }
        document.title = "Make your page | Tondo";
        const { mountStart } = await import("./app/builder");
        mountStart(here, account);
        return;
    }
    if (path === "/start") {
        location.replace(appPath("/"));
        return;
    }
    if (path === "/edit") {
        document.title = "Edit page | Tondo";
        const { mountEditor } = await import("./app/builder");
        await mountEditor(here, account);
        return;
    }
    const { mountDashboard } = await import("./app/dashboard");
    mountDashboard(here, account);
}

async function openLab(here: HTMLElement, lab: string): Promise<void> {
    const { mountLab } = await import("./app/labs");
    mountLab(here, lab);
}

// The back button can restore a frozen page, so it has to ask again who's logged in.
window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
});

const lab = import.meta.env.DEV ? location.search.slice(1) : "";
const opening =
    lab === "fields" || lab === "blocks" || lab === "plans" ? openLab(root, lab) : open(root);
opening.catch((error: unknown) => {
    // The server says what's wrong when it can. A failed fetch has no message worth showing.
    const said = error instanceof TypeError || !(error instanceof Error) ? "" : error.message;
    root.textContent = said || UNREACHABLE;
});
