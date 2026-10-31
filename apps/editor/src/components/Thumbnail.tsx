import { createEffect } from "solid-js";

// One stylesheet per block and look, shared by every thumbnail that uses it.
const sheets = new Map<string, CSSStyleSheet>();
function sheetFor(css: string): CSSStyleSheet {
    const found = sheets.get(css);
    if (found) return found;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
        `${css}\n.thumb{position:absolute;left:0;top:0;width:390px;transform-origin:0 0;pointer-events:none}.thumb .page{min-height:0;padding-bottom:18px;overflow:hidden}.thumb #t-blocks>:first-child{margin-top:10px}.thumb-short .page{height:342px;display:flex;flex-direction:column;justify-content:center}`,
    );
    sheets.set(css, sheet);
    return sheet;
}

interface ThumbnailProps {
    html: string;
    css: string;
    look: string;
    /** The width of the tile, so the 390-wide page can be scaled to fit it. */
    width: number;
    /** Centres a short block in its tile. Headers start at the top, as they do on a page. */
    short?: boolean;
}

/** A real rendering of the page's own content, kept apart from the editor's styles by a shadow root. */
export function Thumbnail(props: ThumbnailProps) {
    let host: HTMLDivElement | undefined;
    createEffect(() => {
        if (!host) return;
        const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
        root.adoptedStyleSheets = [sheetFor(props.css)];
        const scale = props.width / 390;
        root.innerHTML = `<div class="look ${props.look} thumb${props.short ? " thumb-short" : ""}" style="transform:scale(${String(scale)})"><div class="page"><div id="t-blocks">${props.html}</div></div></div>`;
    });
    return (
        <div
            class="thumb-host"
            ref={(el) => {
                host = el;
            }}
        />
    );
}
