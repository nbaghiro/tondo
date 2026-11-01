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
        initials: escapeHtml(
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word.charAt(0).toUpperCase())
                .join(""),
        ),
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

const paintBack = (p: HeaderParts) => `<div class="p-paint">${p.art}</div>`;
const words = (p: HeaderParts) => `${p.name}${p.tagline}${p.bio}${p.links}`;

// Every look can use these, so they only rely on the look's variables.
const LAYOUTS = {
    centred: (p: HeaderParts) =>
        `${paintBack(p)}<header class="p-head">${p.avatar}${words(p)}</header>`,
    left: (p: HeaderParts) =>
        `${paintBack(p)}<header class="p-head">${p.avatar}<div>${p.name}${p.tagline}</div></header><div class="h-after">${p.bio}${p.links}</div>`,
    full: (p: HeaderParts) =>
        `<div class="h-pic">${p.image}</div><header class="p-head">${words(p)}</header>`,
    arch: (p: HeaderParts) =>
        `${paintBack(p)}<div class="h-pic">${p.image}</div><header class="p-head">${words(p)}</header>`,
    banner: (p: HeaderParts) =>
        `<div class="h-pic">${p.image}</div><header class="p-head">${p.avatar}${words(p)}</header>`,
};

export function renderHeader(page: Page, ctx: RenderContext): string {
    const look = looks[page.look];
    const parts = partsOf(page, ctx);
    const { layout } = page.header;
    if (layout === "look") {
        const own = look.header ? look.header(parts) : LAYOUTS.centred(parts);
        return `<div class="h-own">${own}${parts.button}</div>`;
    }
    return `<div class="h-${layout}">${LAYOUTS[layout](parts)}${parts.button}</div>`;
}
