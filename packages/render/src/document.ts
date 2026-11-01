import { allBlocks, blockDefinitions, drawBlock, escapeHtml, liveContent } from "@tondo/page";
import type { Block, Page, RenderContext } from "@tondo/page";
import { isSafeUrl } from "@tondo/page";
import { baseCss } from "./base-css";
import { renderHeader } from "./header";
import { LINK, linkId, trackLinks, unescapeHtml } from "./links";
import { looks } from "./looks";
import {
    fontChoices,
    lookCss,
    placeholderFor,
    styleCss,
    WORDMARK_FONTS,
    wordmarkCss,
} from "./style";

const FONT_ORIGIN = "https://fonts.googleapis.com/css2?";

export function fontsHref(page: Page): string {
    const pair = fontChoices.find((choice) => choice.id === page.style?.font);
    const parts = [
        looks[page.look].fonts,
        ...(pair ? [pair.query] : []),
        ...(page.header.wordmark ? [WORDMARK_FONTS] : []),
    ];
    return `${FONT_ORIGIN}${parts.join("&")}&display=swap`;
}

/** Everything the page needs apart from its fonts: only its own look, and only the blocks it uses. */
export function renderCss(page: Page, assetBase = "/photos/"): string {
    const used = new Set(allBlocks(page.blocks).map((block) => block.type));
    const blockCss = [...used].map((type) => blockDefinitions[type].css).join("\n");
    const wordmark = page.header.wordmark ? wordmarkCss : "";
    return `${baseCss}\n${blockCss}\n${wordmark}\n${lookCss(page)}\n${styleCss(page, assetBase)}`;
}

export function renderBlock(block: Block, ctx: RenderContext): string {
    return drawBlock(block, ctx);
}

// A tinted section sits on one band of colour, so its blocks stay together.
function drawTop(blocks: readonly Block[], ctx: RenderContext): string {
    let html = "";
    let band: string | null = null;
    for (const block of blocks) {
        const key = block.tint ? (block.section ?? block.id) : null;
        if (band !== key) {
            if (band !== null) html += "</div>";
            if (key !== null) html += `<div class="b-tint">`;
            band = key;
        }
        html += drawBlock(block, ctx);
    }
    return band === null ? html : `${html}</div>`;
}

export function renderBody(page: Page, ctx: RenderContext, now = new Date()): string {
    const withNow = { ...ctx, now, placeholder: placeholderFor(page) };
    return `<main class="page"><div id="t-header">${renderHeader(page, withNow)}</div><div id="t-blocks">${drawTop(page.blocks, withNow)}</div></main>`;
}

export interface DocumentOptions extends RenderContext {
    title: string;
    /** Extra rules for the editor's canvas. Published pages have none. */
    editorCss?: string;
    now?: Date;
    /** The live page's address. Its links then go through /l/, which counts clicks. */
    trackAs?: string;
    /** Draws what a visitor sees, leaving out sample content and empty tabs. */
    live?: boolean;
    onDrawError?: (type: string, error: unknown) => void;
}

export function renderDocument(saved: Page, options: DocumentOptions): string {
    const { title, editorCss = "", now, assetBase, editable, trackAs, live, onDrawError } = options;
    const page = live ? liveContent(saved).page : saved;
    const ctx = { assetBase, editable, ...(onDrawError ? { onDrawError } : {}) };
    const body = renderBody(page, ctx, now);
    const description = page.description
        ? `<meta name="description" content="${escapeHtml(page.description)}">`
        : "";
    return `<!doctype html><html lang="en" class="look ${page.look}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title ?? title)}</title>${description}<link rel="icon" href="${escapeHtml(ctx.assetBase)}favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link id="t-fonts" rel="stylesheet" href="${escapeHtml(fontsHref(page))}"><style id="t-styles">${renderCss(page, assetBase)}</style>${editorCss ? `<style>${editorCss}</style>` : ""}</head><body>${trackAs ? trackLinks(body, trackAs) : body}</body></html>`;
}

/** The address a tracked link goes to, or null if the live page has no such link. */
export function findLink(page: Page, target: string, now = new Date()): string | null {
    const body = renderBody(
        liveContent(page).page,
        { assetBase: "/photos/", editable: false },
        now,
    );
    for (const match of body.matchAll(LINK)) {
        const url = unescapeHtml(match[1] ?? "");
        if (linkId(url) === target && isSafeUrl(url)) return url;
    }
    return null;
}
