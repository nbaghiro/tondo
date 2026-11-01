import { render } from "solid-js/web";
import type { Account } from "../lib/account";
import { Shell } from "../components/Shell";
import "../styles/shell.css";

export function mountDashboard(root: HTMLElement, account: Account): void {
    root.innerHTML = "";
    render(() => <Shell account={account} />, root);
}
