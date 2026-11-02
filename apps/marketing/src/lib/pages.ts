import { allBlocks, readPage } from "@tondo/page";
import type { Block, Page } from "@tondo/page";
import { renderDocument } from "@tondo/render";

// The gallery's pages are drawn as of this date, so their countdowns and events don't run out.
export const GALLERY_DATE = new Date("2026-10-31T00:00:00Z");

const files = import.meta.glob<unknown>("../data/pages/*.json", { import: "default", eager: true });

export function examplePage(handle: string): Page {
    return readPage(files[`../data/pages/${handle}.json`]);
}

export function firstBlock(handle: string, type: Block["type"]): Block {
    const found = allBlocks(examplePage(handle).blocks).find((block) => block.type === type);
    if (!found) throw new Error(`${handle} has no ${type} block.`);
    return found;
}

/** Drawn as a person's live page is. It leaves out link counting and the report link. */
export const exampleHtml = (page: Page): string =>
    renderDocument(page, {
        title: page.header.name,
        assetBase: "/photos/",
        editable: false,
        live: true,
        now: GALLERY_DATE,
    });

// Example pages are made up, so nothing on them can lead outside Tondo. Tapping one of these says why.
const EXAMPLE_NOTE = `<div id="example-note" role="status" hidden style="position:fixed;z-index:50;left:50%;bottom:20px;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);padding:10px 16px;border-radius:14px;background:var(--fg);color:var(--bg);font:14px/1.4 var(--body);box-shadow:0 0 0 2px var(--bg),0 6px 20px rgb(0 0 0 / 30%)">This is an example page, so this doesn't go anywhere. <a href="/signup" target="_top" style="text-decoration:underline">Make your own</a></div><script>(()=>{const note=document.getElementById("example-note");let timer;const show=(event)=>{event.preventDefault();note.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{note.hidden=true;},4000);};document.addEventListener("click",(event)=>{if(event.target.closest?.('a[href="#"]'))show(event);});document.addEventListener("submit",show);})();</script>`;

const LINK = /(<a\b[^>]*?\bhref=")([^"]*)"/g;

/** An example page at its own address, with its made-up links held back. */
export const exampleDocument = (page: Page): string =>
    exampleHtml(page)
        .replace(LINK, (link: string, start: string, href: string) =>
            href.startsWith("/") || href.startsWith("#") ? link : `${start}#"`,
        )
        .replace("</body>", `${EXAMPLE_NOTE}</body>`);

/** Every link in a small preview opens the example page it came from. */
export const linksTo = (html: string, handle: string): string =>
    html.replace(LINK, `$1/${handle}"`);
