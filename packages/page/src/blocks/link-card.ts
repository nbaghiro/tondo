import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    linkValue,
    photoTag,
    safeHref,
} from "../define-block";
import { link, longText, photo, text } from "../fields";

export const linkCard = defineBlock({
    schema: blockSchema("link-card", ["small", "large"], {
        photo: z.string(),
        position: z.string().optional(),
        title: z.string().max(120),
        text: z.string().max(200),
        url: linkValue,
    }),
    name: "Link with photo",
    group: "actions",
    variantLabels: { small: "Small photo", large: "Large photo" },
    fields: [
        photo("photo", "Photo"),
        text("title", "Title"),
        longText("text", "Description"),
        link("url", "Link"),
    ],
    make: () => ({
        type: "link-card" as const,
        variant: "small" as const,
        photo: "desk1",
        title: "Read my latest post",
        text: "A short line about it",
        url: "",
    }),
    css: `.b-card{display:grid;grid-template-columns:72px 1fr;gap:13px;align-items:center;background:var(--card);color:var(--cardfg)!important;border-radius:var(--r);border:var(--line-b,1px solid var(--line));padding:8px;margin-top:10px;box-shadow:var(--sh,none)}.b-card-i{display:block;width:72px;height:72px;border-radius:calc(var(--r) - 6px);overflow:hidden}.b-card b{display:block;line-height:1.25}.b-card small{display:block;font-size:13.5px;opacity:.76;margin-top:2px}.b-card-large{grid-template-columns:1fr}.b-card-large .b-card-i{width:100%;height:190px}`,
    render: (block, ctx) =>
        `<a class="b-card${block.variant === "large" ? " b-card-large" : ""}" href="${safeHref(block.url)}"><span class="b-card-i">${photoTag(ctx, block.photo, block.position)}</span><span>${editableText(ctx, "b", "title", block.title)}${block.text || ctx.editable ? editableText(ctx, "small", "text", block.text) : ""}</span></a>`,
});
