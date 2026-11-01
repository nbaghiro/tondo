import { routes } from "@tondo/contract";
import type { MeResponse, SignOutResponse } from "@tondo/contract";

export type Account = MeResponse & { handle: string };

/** Null handle means this person still needs the start flow. */
export type LoadedAccount = MeResponse;

export const SITE_URL =
    (import.meta.env["VITE_SITE_URL"] as string | undefined) ??
    (import.meta.env.DEV ? "http://localhost:8103" : "");

export const UNREACHABLE = "We couldn't reach Tondo. Reload this page to try again.";

export async function loadAccount(): Promise<LoadedAccount | null> {
    const res = await fetch(routes.me);
    if (res.status === 401) {
        location.assign(`${SITE_URL}/login`);
        return null;
    }
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? UNREACHABLE);
    }
    return (await res.json()) as MeResponse;
}

/** Where a published page lives. In development, the server is on its own port. */
export const pageUrl = (handle: string): string =>
    import.meta.env.DEV ? `http://localhost:8101/${handle}` : `/${handle}`;

/** An address inside the app, which sits at /app in production and at the root in development. */
export const appPath = (path: string): string =>
    `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;

export const toLogin = (): void => {
    location.assign(`${SITE_URL}/login`);
};

const sessions = new BroadcastChannel("tondo-session");

/** When another tab logs out, this one follows instead of showing a page it can't save. */
export const followLogOut = (): void => {
    sessions.onmessage = toLogin;
};

function sayLogOutFailed(): void {
    const note = document.createElement("div");
    note.className = "logout-failed";
    note.setAttribute("role", "alert");
    note.textContent = "We couldn't log you out, so you're still logged in. Please try again.";
    note.style.cssText =
        "position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;margin:auto;max-width:480px;padding:12px 16px;border-radius:8px;background:#1d1a17;color:#fff";
    document.querySelector(".logout-failed")?.remove();
    document.body.append(note);
}

async function endSession(): Promise<void> {
    const res = await fetch(routes.signOut, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    }).catch(() => null);
    const answer = (await res?.json().catch(() => null)) as SignOutResponse | null | undefined;
    // Only our server sends this answer, and it comes with the cookies cleared.
    if (typeof answer?.ended !== "boolean") {
        sayLogOutFailed();
        return;
    }
    sessions.postMessage("logged-out");
    location.assign(answer.ended ? SITE_URL || "/" : `${SITE_URL}/login?notice=device-only`);
}

export function logOut(): void {
    endSession().catch(sayLogOutFailed);
}
