import { allBlocks, blockDefinitions, drawBlock, escapeHtml } from "@tondo/page";
import type { Block, Page, RenderContext } from "@tondo/page";
import { isSafeUrl } from "@tondo/page";
import { baseCss } from "./base-css";
import { renderHeader } from "./header";
import { LINK, linkId, trackLinks, unescapeHtml } from "./links";
import { looks } from "./looks";

const FONT_ORIGIN = "https://fonts.googleapis.com/css2?";

export function fontsHref(page: Page): string {
    return `${FONT_ORIGIN}${looks[page.look].fonts}&display=swap`;
}

/** Everything the page needs apart from its fonts: only its own look, and only the blocks it uses. */
export function renderCss(page: Page): string {
    const used = new Set(allBlocks(page.blocks).map((block) => block.type));
    const blockCss = [...used].map((type) => blockDefinitions[type].css).join("\n");
    return `${baseCss}\n${blockCss}\n${looks[page.look].css}`;
}

export function renderBlock(block: Block, ctx: RenderContext): string {
    return drawBlock(block, ctx);
}

export function renderBody(page: Page, ctx: RenderContext, now = new Date()): string {
    const withNow = { ...ctx, now };
    return `<main class="page"><div id="t-header">${renderHeader(page, withNow)}</div><div id="t-blocks">${page.blocks.map((block) => drawBlock(block, withNow)).join("")}</div></main>`;
}

export interface DocumentOptions extends RenderContext {
    title: string;
    /** Extra rules for the editor's canvas. Published pages have none. */
    editorCss?: string;
    now?: Date;
    /** The live page's address. Its links then go through /l/, which counts clicks. */
    trackAs?: string;
}

export function renderDocument(page: Page, options: DocumentOptions): string {
    const { title, editorCss = "", now, assetBase, editable, trackAs } = options;
    const ctx = { assetBase, editable };
    const body = renderBody(page, ctx, now);
    const description = page.description
        ? `<meta name="description" content="${escapeHtml(page.description)}">`
        : "";
    return `<!doctype html><html lang="en" class="look ${page.look}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title ?? title)}</title>${description}<link rel="icon" href="${escapeHtml(ctx.assetBase)}favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link id="t-fonts" rel="stylesheet" href="${escapeHtml(fontsHref(page))}"><style id="t-styles">${renderCss(page)}</style>${editorCss ? `<style>${editorCss}</style>` : ""}</head><body>${trackAs ? trackLinks(body, trackAs) : body}</body></html>`;
}

/** The address a tracked link goes to, or null if the live page has no such link. */
export function findLink(page: Page, target: string, now = new Date()): string | null {
    const body = renderBody(page, { assetBase: "/photos/", editable: false }, now);
    for (const match of body.matchAll(LINK)) {
        const url = unescapeHtml(match[1] ?? "");
        if (linkId(url) === target && isSafeUrl(url)) return url;
    }
    return null;
}
