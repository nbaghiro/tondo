import { escapeHtml, icon, leavesOut, photoTag, safeHref } from "@tondo/page";
import type { Page, RenderContext } from "@tondo/page";
import { paint } from "./art";
import type { HeaderParts } from "./define-look";
import { looks } from "./looks";
import { paintFor, photoStandIns, recolourHtml, themeOf } from "./style";

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

const wordmarkSize = (name: string, base: number) =>
    Math.round(Math.min(base, (base * 9.5) / Math.max(5, name.length)));

/** The name drawn as a logo, from the page's fonts and colours. */
function wordmark(page: Page, ctx: RenderContext): string {
    const { name, wordmark: kind } = page.header;
    const base = { bubble: 56, poster: 62, script: 58, paint: 62, seal: 34 };
    if (!kind) return "";
    const words = escapeHtml(kind === "poster" ? name.toUpperCase() : name);
    const art = kind === "paint" && ctx.wordmarkArt ? ctx.wordmarkArt().replace(/"/g, "%22") : "";
    const backing = art ? `;background-image:url(&quot;${escapeHtml(art)}&quot;)` : "";
    return `<h1 aria-label="${escapeHtml(name)}"><span class="wm wm-${kind}" style="font-size:${String(wordmarkSize(name, base[kind]))}px${backing}">${words}</span></h1>`;
}

function partsOf(page: Page, ctx: RenderContext): HeaderParts {
    const shownLinks = ctx.editable
        ? page.header.links
        : page.header.links.filter((link) => link.value);
    const look = looks[page.look];
    const theme = themeOf(page);
    const { name, tagline, bio, photo, buttonText, buttonUrl } = page.header;
    const image = leavesOut(ctx, photo) ? "" : photoTag(ctx, photo);
    return {
        art: paint(theme ? paintFor(theme) : (page.paint ?? look.palette), page.seed ?? look.seed, {
            screen: theme ? theme.dark : look.screen,
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
        name: wordmark(page, ctx) || editable(ctx, "h1", "name", name),
        tagline: editable(ctx, "span", "tagline", tagline, "p-tag"),
        bio: editable(ctx, "p", "bio", bio),
        links: shownLinks.length
            ? `<div class="b-social">${shownLinks
                  .map(
                      (link) =>
                          `<a href="${safeHref(link.value)}" aria-label="${link.type}">${icon(link.type)}</a>`,
                  )
                  .join("")}</div>`
            : "",
        button:
            buttonText && (buttonUrl || ctx.editable)
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

export function renderHeader(page: Page, ctxIn: RenderContext): string {
    const look = looks[page.look];
    const ctx = { ...photoStandIns(page), ...ctxIn };
    const parts = partsOf(page, ctx);
    const { layout } = page.header;
    if (layout === "look") {
        const own = look.header ? look.header(parts) : LAYOUTS.centred(parts);
        // A long name gets more room, since a look's own type is sized for a short one.
        const words = page.header.name.split(/\s+/);
        const long =
            page.header.name.length > 14 || words.some((word) => word.length > 8) ? " h-long" : "";
        return recolourHtml(`<div class="h-own${long}">${own}${parts.button}</div>`, page);
    }
    return `<div class="h-${layout}">${LAYOUTS[layout](parts)}${parts.button}</div>`;
}
