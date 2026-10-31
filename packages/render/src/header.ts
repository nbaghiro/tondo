import { escapeHtml, icon, photoTag, safeHref } from "@tondo/page";
import type { Page, RenderContext } from "@tondo/page";
import { paint } from "./art";
import type { HeaderParts } from "./define-look";
import { looks } from "./looks";

const editable = (
    ctx: RenderContext,
    tag: string,
    path: string,
    value: string | undefined,
    cls = "",
) => {
    if (!value && !ctx.editable) return "";
    const className = cls ? ` class="${cls}"` : "";
    const data = ctx.editable ? ` data-field="${path}"` : "";
    return `<${tag}${className}${data}>${escapeHtml(value ?? "")}</${tag}>`;
};

function partsOf(page: Page, ctx: RenderContext): HeaderParts {
    const look = looks[page.look];
    const { name, tagline, bio, photo, links, buttonText, buttonUrl } = page.header;
    const image = photoTag(ctx, photo);
    return {
        art: paint(page.paint ?? look.palette, page.seed ?? look.seed, {
            screen: look.screen,
            ring: look.ring,
        }),
        image,
        avatar: image ? `<span class="p-av">${image}</span>` : "",
        name: editable(ctx, "h1", "name", name),
        tagline: editable(ctx, "span", "tagline", tagline, "p-tag"),
        bio: editable(ctx, "p", "bio", bio),
        links: links.length
            ? `<div class="b-social">${links
                  .map(
                      (link) =>
                          `<a href="${safeHref(link.value)}" aria-label="${link.type}">${icon(link.type)}</a>`,
                  )
                  .join("")}</div>`
            : "",
        button: buttonText
            ? `<a class="b-btn p-btn" href="${safeHref(buttonUrl)}">${editable(ctx, "span", "buttonText", buttonText)}</a>`
            : "",
    };
}

const paintedCentred = (p: HeaderParts) =>
    `<div class="p-paint">${p.art}</div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>${p.button}`;

export function renderHeader(page: Page, ctx: RenderContext): string {
    const look = looks[page.look];
    const parts = partsOf(page, ctx);
    const own = page.header.layout === "look";
    const body = own && look.header ? look.header(parts) : paintedCentred(parts);
    return `<div class="${own ? "h-own" : `h-${page.header.layout}`}">${body}</div>`;
}
