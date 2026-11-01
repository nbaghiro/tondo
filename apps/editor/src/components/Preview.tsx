import type { Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";
import { For, onCleanup, Show } from "solid-js";
import { Glyph } from "./Panels";
import { Phone } from "./Phone";

/** The page as visitors see it, with links opening elsewhere. */
export function Preview(props: {
    page: Page;
    onClose: () => void;
    /** When this preview is of free choices: what changes, and the way to publish them. */
    freeChoices?: { changes: string[]; onPublish: () => void; busy: boolean } | undefined;
}) {
    const html = () =>
        renderDocument(props.page, {
            title: "Preview",
            assetBase: "/photos/",
            editable: false,
            live: true,
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
            <Show when={props.freeChoices}>
                {(free) => (
                    <div class="free-choices" data-free-preview>
                        <p>
                            This is what would go live. Your draft keeps everything, so nothing is
                            lost.
                        </p>
                        <ul>
                            <For each={free().changes}>{(line) => <li>{line}</li>}</For>
                        </ul>
                        <button
                            type="button"
                            class="go"
                            data-publish-this
                            disabled={free().busy}
                            onClick={() => {
                                free().onPublish();
                            }}
                        >
                            {free().busy ? "Publishing" : "Publish this"}
                        </button>
                    </div>
                )}
            </Show>
        </div>
    );
}
