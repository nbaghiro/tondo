import { z } from "zod";
import type { Field } from "./fields";
import { isSafeUrl } from "./urls";

export interface RenderContext {
    /** Where photos are served from, ending in a slash. */
    assetBase: string;
    /** Adds the attributes the editor needs. Published pages leave them out. */
    editable: boolean;
    now?: Date | undefined;
    /** Draws a painted placeholder photo. The renderer fills this in, since it knows the page. */
    placeholder?: ((n: number) => string) | undefined;
}

export type BlockGroup = "words" | "actions" | "media" | "selling" | "collecting" | "details";

const ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Text a person can edit in place on the canvas. Empty text only exists while editing. */
export function editableText(
    ctx: RenderContext,
    tag: string,
    path: string,
    value: string | undefined,
    className = "",
): string {
    if (!value && !ctx.editable) return "";
    const cls = className ? ` class="${className}"` : "";
    const data = ctx.editable ? ` data-field="${escapeHtml(path)}"` : "";
    return `<${tag}${cls}${data}>${escapeHtml(value ?? "")}</${tag}>`;
}

const percent = z.number().min(0).max(100);

/** A photo and the point its frame crops around. Centred and unzoomed values are left out. */
export const photoValue = z.strictObject({
    // A demo photo's name, or an upload's path. Never a full address, so no page loads images elsewhere.
    file: z
        .string()
        .max(200)
        .regex(/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/i),
    x: percent.optional(),
    y: percent.optional(),
    zoom: z.number().min(1).max(3).optional(),
});
export type Photo = z.output<typeof photoValue>;

export function photoStyle(photo: Photo): string {
    const x = photo.x ?? 50;
    const y = photo.y ?? 50;
    const rules = x === 50 && y === 50 ? [] : [`object-position:${String(x)}% ${String(y)}%`];
    if (photo.zoom && photo.zoom !== 1) {
        rules.push(`transform:scale(${String(photo.zoom)})`);
        rules.push(`transform-origin:${String(x)}% ${String(y)}%`);
    }
    return rules.join(";");
}

const PLACEHOLDER = /^paint-(\d+)$/;

/** A new section's painted stand-in, so an unfilled page already looks designed. */
export const isPlaceholder = (photo: Photo | undefined): boolean =>
    photo !== undefined && PLACEHOLDER.test(photo.file);

export function photoTag(ctx: RenderContext, photo: Photo | undefined, alt = ""): string {
    if (!photo) return "";
    const style = photoStyle(photo);
    const painted = PLACEHOLDER.exec(photo.file)?.[1];
    const src =
        painted && ctx.placeholder ? ctx.placeholder(Number(painted)) : ctx.assetBase + photo.file;
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy"${style ? ` style="${style}"` : ""}>`;
}

/** An empty link is allowed while a page is a draft. Publishing is what requires one. */
export const linkValue = z
    .string()
    .refine(
        (value) => value === "" || isSafeUrl(value),
        "Use a link starting with https://, http://, mailto: or tel:.",
    );

export const safeHref = (url: string | undefined): string =>
    escapeHtml(url === undefined || url === "" ? "#" : url);

/** A link, or plain content when it has nowhere to go. A live page has no links that do nothing. */
export function linkOr(
    ctx: RenderContext,
    url: string | undefined,
    cls: string,
    inner: string,
): string {
    const attr = cls ? ` class="${cls}"` : "";
    return url || ctx.editable
        ? `<a${attr} href="${safeHref(url)}">${inner}</a>`
        : `<div${attr}>${inner}</div>`;
}

const shared = {
    hidden: z.boolean().optional(),
    showFrom: z.iso.datetime().optional(),
    showUntil: z.iso.datetime().optional(),
    highlight: z.boolean().optional(),
    /** Blocks next to each other with the same id move and go together as one section. */
    section: z.string().min(1).optional(),
    tint: z.boolean().optional(),
};

/** The schema every block shares: identity, its layout, and the controls every block has. */
export function blockSchema<
    const Type extends string,
    const Variant extends string,
    const Shape extends z.ZodRawShape,
>(type: Type, variants: readonly [Variant, ...Variant[]], shape: Shape) {
    return z.strictObject({
        id: z.string().min(1),
        type: z.literal(type),
        variant: z.enum(variants),
        ...shared,
        ...shape,
    });
}

export interface Shared {
    id: string;
    hidden?: boolean | undefined;
    showFrom?: string | undefined;
    showUntil?: string | undefined;
    highlight?: boolean | undefined;
    section?: string | undefined;
    tint?: boolean | undefined;
}

export function isShowing(block: Shared, now: Date): boolean {
    if (block.hidden) return false;
    if (block.showFrom && new Date(block.showFrom) > now) return false;
    if (block.showUntil && new Date(block.showUntil) < now) return false;
    return true;
}

function offLabel(block: Shared, now: Date): string {
    if (block.hidden) return "Hidden";
    if (block.showFrom && new Date(block.showFrom) > now) return "Scheduled";
    return "Ended";
}

/** Everything around a block's own drawing: visibility, highlight and what the editor needs. */
export function wrapBlock(
    block: Shared,
    name: string,
    html: string,
    ctx: RenderContext,
    extraClass = "",
): string {
    const now = ctx.now ?? new Date();
    const showing = isShowing(block, now);
    if (!ctx.editable) {
        if (!showing || !html) return "";
        return block.highlight ? `<div class="b-hl">${html}</div>` : html;
    }
    const classes = ["t-block"];
    if (block.highlight) classes.push("b-hl");
    if (!showing) classes.push("t-off");
    if (extraClass) classes.push(extraClass);
    const badge = showing ? "" : `<span class="t-badge">${offLabel(block, now)}</span>`;
    const body =
        html || `<div class="t-placeholder">${escapeHtml(name)}. Nothing to show yet</div>`;
    return `<div class="${classes.join(" ")}" data-block-id="${escapeHtml(block.id)}">${badge}${body}</div>`;
}

export interface Layout {
    label: string;
    /** Needs something that isn't built yet. It renders, but stays out of the picker. */
    held?: boolean;
}

interface BlockSpec<Schema extends z.ZodType> {
    schema: Schema;
    name: string;
    group: BlockGroup;
    /** Needs something that isn't built yet. It renders, but stays out of the shelf. */
    held?: boolean;
    layouts: Record<string, Layout>;
    fields: readonly Field[];
    /** What a newly added block starts with, so it looks right before any editing. */
    make: () => Omit<z.output<Schema>, "id">;
    css: string;
    render: (block: z.output<Schema>, ctx: RenderContext) => string;
}

export interface BlockDefinition {
    name: string;
    group: BlockGroup;
    held: boolean;
    layouts: Record<string, Layout>;
    fields: readonly Field[];
    css: string;
    make: () => Record<string, unknown>;
    draw: (value: unknown, ctx: RenderContext) => string;
}

/** Every block file calls this, which is what keeps them all the same shape. */
export function defineBlock<Schema extends z.ZodType>(
    spec: BlockSpec<Schema>,
): BlockDefinition & { schema: Schema } {
    return {
        schema: spec.schema,
        name: spec.name,
        group: spec.group,
        held: spec.held ?? false,
        layouts: spec.layouts,
        fields: spec.fields,
        css: spec.css,
        make: () => ({ ...spec.make() }),
        draw: (value, ctx) => spec.render(spec.schema.parse(value), ctx),
    };
}
