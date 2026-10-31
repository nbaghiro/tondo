import { blockDefinitions, escapeHtml } from "@tondo/page";
import type { Block, Page, RenderContext } from "@tondo/page";
import { baseCss } from "./base-css";
import { renderHeader } from "./header";
import { looks } from "./looks";

const FONT_ORIGIN = "https://fonts.googleapis.com/css2?";

const blockCss = Object.values(blockDefinitions)
    .map((definition) => definition.css)
    .join("\n");

export function fontsHref(page: Page): string {
    return `${FONT_ORIGIN}${looks[page.look].fonts}&display=swap`;
}

/** Everything the page needs apart from its fonts. Only the page's own look is included. */
export function renderCss(page: Page): string {
    return `${baseCss}\n${blockCss}\n${looks[page.look].css}`;
}

function isShowing(block: Block, now: Date): boolean {
    if (block.hidden) return false;
    if (block.showFrom && new Date(block.showFrom) > now) return false;
    if (block.showUntil && new Date(block.showUntil) < now) return false;
    return true;
}

export function renderBlock(block: Block, ctx: RenderContext): string {
    const html = blockDefinitions[block.type].draw(block, ctx);
    return ctx.editable
        ? `<div class="t-block" data-block-id="${escapeHtml(block.id)}">${html}</div>`
        : html;
}

export function renderBody(page: Page, ctx: RenderContext, now = new Date()): string {
    const blocks = ctx.editable
        ? page.blocks
        : page.blocks.filter((block) => isShowing(block, now));
    return `<main class="page"><div id="t-header">${renderHeader(page, ctx)}</div><div id="t-blocks">${blocks.map((block) => renderBlock(block, ctx)).join("")}</div></main>`;
}

export interface DocumentOptions extends RenderContext {
    title: string;
    /** Extra rules for the editor's canvas. Published pages have none. */
    editorCss?: string;
    now?: Date;
}

export function renderDocument(page: Page, options: DocumentOptions): string {
    const { title, editorCss = "", now, assetBase, editable } = options;
    const ctx = { assetBase, editable };
    return `<!doctype html><html lang="en" class="look ${page.look}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><link rel="icon" href="${escapeHtml(ctx.assetBase)}favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link id="t-fonts" rel="stylesheet" href="${escapeHtml(fontsHref(page))}"><style id="t-styles">${renderCss(page)}</style>${editorCss ? `<style>${editorCss}</style>` : ""}</head><body>${renderBody(page, ctx, now)}</body></html>`;
}
