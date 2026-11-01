import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { file as fileField, text } from "../fields";
import { icon } from "../icons";
import { cardCss } from "./parts";

export const file = defineBlock({
    schema: blockSchema("file", ["card"], {
        file: z.strictObject({ name: z.string().max(200), size: z.number() }).optional(),
        title: z.string().max(60),
        sub: z.string().max(40).optional(),
    }),
    name: "File",
    group: "media",
    layouts: { card: { label: "Card" } },
    fields: [
        fileField("file", "File"),
        text("title", "Title", { max: 60, inline: true }),
        text("sub", "Short line", { max: 40, inline: true }),
    ],
    make: () => ({
        type: "file" as const,
        variant: "card" as const,
        title: "Care guide for your pots",
        sub: "PDF, 4 pages",
    }),
    css: `.b-file{display:flex;align-items:center;gap:12px;margin-top:10px;${cardCss};color:var(--cardfg)!important;padding:12px 14px}.b-file>span:nth-child(2){flex:1;min-width:0}.b-file b{display:block;line-height:1.2}.b-file small{font-size:13px;opacity:.72}.b-file .ic{flex:none;color:var(--acc)}`,
    render: (block, ctx) =>
        block.title || ctx.editable
            ? `<a class="b-file" href="#">${icon("download")}<span>${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}</span><span class="b-chip">Get it</span></a>`
            : "",
});
