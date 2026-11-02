import { createSignal } from "solid-js";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** The path inside the app, wherever the app is served from. */
export const inAppPath = (): string =>
    location.pathname.slice(base.length).replace(/\/$/, "") || "/";

const [path, setPath] = createSignal(inAppPath());
const [search, setSearch] = createSignal(location.search);
export { path };

/** The page named in the address, if any. */
export const askedPage = (): string | null => new URLSearchParams(search()).get("page");

/** Moves within the dashboard without reloading. */
export function navigate(to: string): void {
    history.pushState(null, "", `${base}${to}`);
    setPath(inAppPath());
    setSearch(location.search);
    window.scrollTo(0, 0);
}

window.addEventListener("popstate", () => {
    setPath(inAppPath());
    setSearch(location.search);
});

/** Lets a plain link move within the app, while still working for new tabs and copied links. */
export function follow(e: MouseEvent, to: string): void {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
}
