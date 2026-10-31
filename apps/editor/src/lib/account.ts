import { routes } from "@tondo/contract";
import type { MeResponse } from "@tondo/contract";

export type Account = MeResponse & { handle: string };

const SITE_URL =
    (import.meta.env["VITE_SITE_URL"] as string | undefined) ??
    (import.meta.env.DEV ? "http://localhost:8103" : "");

export async function loadAccount(): Promise<Account | null> {
    const res = await fetch(routes.me);
    if (res.status === 401) {
        location.assign(`${SITE_URL}/login`);
        return null;
    }
    if (!res.ok) throw new Error("The account couldn't be loaded.");
    const account = (await res.json()) as MeResponse;
    if (account.handle === null) {
        location.assign(`${SITE_URL}/claim`);
        return null;
    }
    return { ...account, handle: account.handle };
}

export function logOut(): void {
    const leave = () => {
        location.assign(SITE_URL || "/");
    };
    fetch(routes.signOut, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    }).then(leave, leave);
}
