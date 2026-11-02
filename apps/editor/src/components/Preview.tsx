import type { Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { onCleanup } from "solid-js";
import { Glyph } from "./Panels";
import { Phone } from "./Phone";

/** The page as visitors see it, with links opening elsewhere. */
export function Preview(props: { page: Page; onClose: () => void }) {
    const html = () =>
        renderDocument(props.page, {
            title: "Preview",
            assetBase: "/photos/",
            // The person's own view, so sample content shows until it's replaced.
            editable: true,
            editorCss: 'a[href="#"]{pointer-events:none}',
        }).replace("<head>", '<head><base target="_blank">');
    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") props.onClose();
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
        document.removeEventListener("keydown", onKey);
    });
    return (
        <div class="preview" role="dialog" aria-label="Preview of your page">
            <button
                type="button"
                class="preview-back"
                aria-label="Back to editing"
                title="Back to editing"
                onClick={() => {
                    props.onClose();
                }}
            >
                <Glyph name="x" />
            </button>
            <Phone class="preview-frame">
                <iframe class="canvas" title="Preview" sandbox="allow-popups" srcdoc={html()} />
            </Phone>
        </div>
    );
}
