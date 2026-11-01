import type { Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";

/** The page as visitors see it, with links opening elsewhere. */
export function Preview(props: { page: Page; onClose: () => void }) {
    const html = () =>
        renderDocument(props.page, {
            title: "Preview",
            assetBase: "/photos/",
            editable: false,
        }).replace("<head>", '<head><base target="_blank">');
    return (
        <div class="preview" role="dialog" aria-label="Preview of your page">
            <button
                class="go preview-back"
                onClick={() => {
                    props.onClose();
                }}
            >
                Back to editing
            </button>
            <div class="phone preview-frame">
                <iframe class="canvas" title="Preview" sandbox="allow-popups" srcdoc={html()} />
            </div>
        </div>
    );
}
