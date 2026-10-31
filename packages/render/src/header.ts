import { escapeHtml, icon, safeHref } from "@tondo/page";
import type { Page, RenderContext } from "@tondo/page";
import { paint } from "./art";
import { looks } from "./looks";

const editable = (ctx: RenderContext, tag: string, path: string, value: string, cls = "") => {
    const className = cls ? ` class="${cls}"` : "";
    const data = ctx.editable ? ` data-field="${path}"` : "";
    return `<${tag}${className}${data}>${escapeHtml(value)}</${tag}>`;
};

function avatar(page: Page, ctx: RenderContext): string {
    const { photo, position, zoom } = page.header;
    if (!photo) return "";
    const style = position ? ` style="object-position:${escapeHtml(position)}"` : "";
    const wrap = zoom ? ` p-zoom" style="--zoom:${zoom}` : "";
    return `<span class="p-av${wrap}"><img src="${escapeHtml(ctx.assetBase + photo)}.jpg" alt=""${style}></span>`;
}

// Looks will choose between several arrangements. The first is the centred avatar.
export function renderHeader(page: Page, ctx: RenderContext): string {
    const look = looks[page.look];
    const { name, tagline, bio, social } = page.header;
    const art = paint(page.paint ?? look.palette, page.seed ?? look.seed, { screen: look.screen });
    const icons = social.length
        ? `<div class="b-social">${social
              .map(
                  (s) =>
                      `<a href="${safeHref(s.url)}" aria-label="${s.network}">${icon(s.network)}</a>`,
              )
              .join("")}</div>`
        : "";
    const line = tagline || ctx.editable ? editable(ctx, "span", "tagline", tagline, "p-tag") : "";
    const about = bio || ctx.editable ? editable(ctx, "p", "bio", bio) : "";
    return `<div class="p-paint">${art}</div><header class="p-head">${avatar(page, ctx)}${editable(ctx, "h1", "name", name)}${line}${about}${icons}</header>`;
}
