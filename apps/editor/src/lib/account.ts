import { routes } from "@tondo/contract";
import type { MeResponse, PageSummary, SignOutResponse } from "@tondo/contract";

/** An account with at least one page. */
export type Account = MeResponse;

/** No pages means this person still needs the start flow. */
export type LoadedAccount = MeResponse;

/** The page named in the address, or the one edited last. Null only with no pages at all. */
export function chosenPage(
    pages: readonly PageSummary[],
    asked = new URLSearchParams(location.search).get("page"),
): PageSummary | null {
    const named = pages.find((page) => page.id === asked);
    if (named) return named;
    return pages.reduce<PageSummary | null>(
        (latest, page) => (latest && latest.updatedAt >= page.updatedAt ? latest : page),
        null,
    );
}

/** How many pages count against this person's plan. Team pages are paid for by the team. */
export const ownPageCount = (pages: readonly PageSummary[]): number =>
    pages.filter((page) => page.side === "own").length;

/** An address inside the app that stays on this page. */
export const onPage = (path: string, pageId: string): string =>
    `${path}${path.includes("?") ? "&" : "?"}page=${pageId}`;

const SCREENS = ["/", "/analytics", "/settings", "/account", "/edit"];

/** Where New page goes. It names the page and screen that Cancel returns to. */
export const newPagePath = (pageId: string, screen: string): string =>
    `/start?page=${pageId}&back=${encodeURIComponent(screen)}`;

/** The page and screen New page was pressed on. Null if this visit didn't come from New page. */
export function newPageOrigin(
    pages: readonly PageSummary[],
): { pageId: string; screen: string } | null {
    const asked = new URLSearchParams(location.search);
    const page = pages.find((other) => other.id === asked.get("page"));
    if (!page) return null;
    const back = asked.get("back") ?? "/";
    return { pageId: page.id, screen: SCREENS.includes(back) ? back : "/" };
}

export const SITE_URL =
    (import.meta.env["VITE_SITE_URL"] as string | undefined) ??
    (import.meta.env.DEV ? "http://localhost:8103" : "");

export const UNREACHABLE = "We couldn't reach Tondo. Reload this page to try again.";

export async function loadAccount(): Promise<LoadedAccount | null> {
    const res = await fetch(routes.me);
    if (res.status === 401) {
        // Someone opening an invitation with no account yet starts by making one.
        const invite = new URLSearchParams(location.search).get("invite");
        location.assign(
            invite && location.pathname.endsWith("/join")
                ? `${SITE_URL}/signup?invite=${encodeURIComponent(invite)}`
                : `${SITE_URL}/login`,
        );
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
