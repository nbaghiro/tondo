import {
    allBlocks,
    blockDefinitions,
    drawBlock,
    escapeHtml,
    isPlaceholder,
    liveContent,
} from "@tondo/page";
import type { Block, Page, RenderContext } from "@tondo/page";
import { isSafeUrl } from "@tondo/page";
import { baseCss } from "./base-css";
import { renderHeader } from "./header";
import { LINK, linkId, trackLinks, unescapeHtml } from "./links";
import { looks } from "./looks";
import {
    fontChoices,
    lookCss,
    photoStandIns,
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
    const withNow = { ...ctx, now, timeZone: page.timeZone, ...photoStandIns(page) };
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
    /** The full address of the live page, for link previews in chats and social apps. */
    shareUrl?: string;
    /** Where the report page is, for a page shown at another address. */
    reportOrigin?: string;
    /** Adds "Made with Tondo" at the foot of the page. */
    badge?: boolean | undefined;
    onDrawError?: (type: string, error: unknown) => void;
}

// What a link preview shows. The photo is only named if it's the person's own.
function shareTags(page: Page, title: string, url: string): string {
    const name = page.title ?? title;
    const text = page.description ?? page.header.tagline ?? page.header.bio ?? "";
    const { photo } = page.header;
    const origin = /^https?:\/\/[^/]+/.exec(url)?.[0] ?? "";
    const image = photo && !isPlaceholder(photo) ? `${origin}/photos/${photo.file}` : "";
    const tag = (key: string, value: string) =>
        value ? `<meta property="${key}" content="${escapeHtml(value)}">` : "";
    return [
        tag("og:type", "profile"),
        tag("og:title", name),
        tag("og:description", text),
        tag("og:url", url),
        tag("og:image", image),
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    ].join("");
}

// Every live page says how to report it, because link pages attract phishing.
const BADGE = `<p data-badge style="margin:0;padding:18px 18px 0;text-align:center;font-size:13px"><a href="https://tondo.page" style="color:inherit;text-decoration:none"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="4" fill="currentColor"/></svg>Made with Tondo</a></p>`;

const reportLink = (handle: string, origin = "") =>
    `<p style="margin:0;padding:18px;text-align:center;font-size:12px"><a href="${escapeHtml(origin)}/report?page=${encodeURIComponent(handle)}" style="color:inherit;opacity:.7">Report this page</a></p>`;

export function renderDocument(saved: Page, options: DocumentOptions): string {
    const { title, editorCss = "", now, assetBase, editable, trackAs, live, onDrawError } = options;
    const { shareUrl, badge, reportOrigin } = options;
    const page = live ? liveContent(saved).page : saved;
    const ctx = { assetBase, editable, live, ...(onDrawError ? { onDrawError } : {}) };
    const body = renderBody(page, ctx, now);
    const description = page.description
        ? `<meta name="description" content="${escapeHtml(page.description)}">`
        : "";
    return `<!doctype html><html lang="en" class="look ${page.look}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(page.title ?? title)}</title>${description}${shareUrl ? `<link rel="canonical" href="${escapeHtml(shareUrl)}">${shareTags(page, title, shareUrl)}` : ""}<link rel="icon" href="${escapeHtml(ctx.assetBase)}favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link id="t-fonts" rel="stylesheet" href="${escapeHtml(fontsHref(page))}"><style id="t-styles">${renderCss(page, assetBase)}</style>${editorCss ? `<style>${editorCss}</style>` : ""}</head><body>${trackAs ? trackLinks(body, trackAs) : body}${badge ? BADGE : ""}${trackAs ? reportLink(trackAs, reportOrigin) : ""}</body></html>`;
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

/** The live page's tracked links, by the id their clicks are counted under. */
export function linkTargets(page: Page, now = new Date()): Record<string, string> {
    const body = renderBody(
        liveContent(page).page,
        { assetBase: "/photos/", editable: false },
        now,
    );
    const found: Record<string, string> = {};
    for (const match of body.matchAll(LINK)) {
        const url = unescapeHtml(match[1] ?? "");
        found[linkId(url)] = url;
    }
    return found;
}
