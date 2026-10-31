import { z } from "zod";
import type { Field } from "./fields";
import { isSafeUrl } from "./urls";

export interface RenderContext {
    /** Where photos are served from, ending in a slash. */
    assetBase: string;
    /** Adds the attributes the editor needs. Published pages leave them out. */
    editable: boolean;
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

/** Text a person can edit in place on the canvas. */
export function editableText(
    ctx: RenderContext,
    tag: string,
    path: string,
    value: string,
    className = "",
): string {
    const cls = className ? ` class="${className}"` : "";
    const data = ctx.editable ? ` data-field="${escapeHtml(path)}"` : "";
    return `<${tag}${cls}${data}>${escapeHtml(value)}</${tag}>`;
}

export function photoTag(ctx: RenderContext, name: string, position = ""): string {
    if (!name) return "";
    const style = position ? ` style="object-position:${escapeHtml(position)}"` : "";
    return `<img src="${escapeHtml(ctx.assetBase + name)}.jpg" alt="" loading="lazy"${style}>`;
}

/** An empty link is allowed while a page is a draft. Publishing is what requires one. */
export const linkValue = z
    .string()
    .refine(
        (value) => value === "" || isSafeUrl(value),
        "Use a link starting with https://, http:// or mailto:.",
    );

export const safeHref = (url: string): string => escapeHtml(url || "#");

/** The schema every block shares: identity, its variant, and the controls every block has. */
export function blockSchema<
    const Type extends string,
    const Variant extends string,
    const Shape extends z.ZodRawShape,
>(type: Type, variants: readonly [Variant, ...Variant[]], shape: Shape) {
    return z.strictObject({
        id: z.string().min(1),
        type: z.literal(type),
        variant: z.enum(variants),
        hidden: z.boolean().optional(),
        showFrom: z.iso.datetime().optional(),
        showUntil: z.iso.datetime().optional(),
        ...shape,
    });
}

interface BlockSpec<Schema extends z.ZodType> {
    schema: Schema;
    name: string;
    group: BlockGroup;
    variantLabels: Record<string, string>;
    fields: readonly Field[];
    /** What a newly added block starts with, so it looks right before any editing. */
    make: () => Omit<z.output<Schema>, "id">;
    css: string;
    render: (block: z.output<Schema>, ctx: RenderContext) => string;
}

export interface BlockDefinition {
    name: string;
    group: BlockGroup;
    variantLabels: Record<string, string>;
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
        variantLabels: spec.variantLabels,
        fields: spec.fields,
        css: spec.css,
        make: () => ({ ...spec.make() }),
        draw: (value, ctx) => spec.render(spec.schema.parse(value), ctx),
    };
}
