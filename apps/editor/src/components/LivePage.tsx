import type { Page } from "@tondo/page";
import { fontsHref, renderBody, renderCss, renderDocument } from "@tondo/render";
import { createEffect, createSignal, untrack } from "solid-js";

const CTX = { assetBase: "/photos/", editable: false };
const SHELL_CSS = "html{scrollbar-width:none}a{pointer-events:none}";

/** A page that redraws as it changes, for the start flow. */
export function LivePage(props: { page: Page }) {
    const [doc, setDoc] = createSignal<Document | null>(null);
    const srcdoc = untrack(() =>
        renderDocument(props.page, { ...CTX, title: "Your page", editorCss: SHELL_CSS }),
    );
    createEffect(() => {
        const d = doc();
        if (!d) return;
        const page = props.page;
        const styles = d.getElementById("t-styles");
        const css = renderCss(page);
        if (styles && styles.textContent !== css) styles.textContent = css;
        const fonts = d.getElementById("t-fonts");
        const href = fontsHref(page);
        if (fonts && fonts.getAttribute("href") !== href) fonts.setAttribute("href", href);
        d.documentElement.className = `look ${page.look}`;
        d.body.innerHTML = renderBody(page, CTX);
    });
    return (
        <iframe
            class="canvas"
            title="Your page"
            srcdoc={srcdoc}
            onLoad={(e) => {
                setDoc(e.currentTarget.contentDocument);
            }}
        />
    );
}
