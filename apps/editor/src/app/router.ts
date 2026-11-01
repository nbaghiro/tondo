import { createSignal } from "solid-js";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

/** The path inside the app, wherever the app is served from. */
export const inAppPath = (): string =>
    location.pathname.slice(base.length).replace(/\/$/, "") || "/";

const [path, setPath] = createSignal(inAppPath());
export { path };

/** Moves within the dashboard without reloading. */
export function navigate(to: string): void {
    history.pushState(null, "", `${base}${to}`);
    setPath(inAppPath());
    window.scrollTo(0, 0);
}

window.addEventListener("popstate", () => {
    setPath(inAppPath());
});

/** Lets a plain link move within the app, while still working for new tabs and copied links. */
export function follow(e: MouseEvent, to: string): void {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
}
