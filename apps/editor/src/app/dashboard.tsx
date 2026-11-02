import { render } from "solid-js/web";
import type { Account, LoadedAccount } from "../lib/account";
import { JoinPage } from "../components/JoinPage";
import { Shell } from "../components/Shell";
import "../styles/shell.css";
import "../styles/home-help.css";
import "../styles/team.css";

export function mountDashboard(root: HTMLElement, account: Account): void {
    root.innerHTML = "";
    render(() => <Shell account={account} />, root);
}

export function mountJoin(root: HTMLElement, account: LoadedAccount): void {
    root.innerHTML = "";
    render(() => <JoinPage account={account} />, root);
}
