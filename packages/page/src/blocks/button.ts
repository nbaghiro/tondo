import { z } from "zod";
import { blockSchema, defineBlock, editableText, linkValue, safeHref } from "../define-block";
import { link, text } from "../fields";

export const button = defineBlock({
    schema: blockSchema("button", ["filled", "outline"], {
        url: linkValue,
        text: z.string().max(40),
    }),
    name: "Button",
    group: "actions",
    layouts: { filled: { label: "Filled" }, outline: { label: "Outline" } },
    fields: [
        link("url", "Link", { fills: "text" }),
        text("text", "Button text", { max: 40, inline: true }),
    ],
    make: () => ({
        type: "button" as const,
        variant: "filled" as const,
        url: "",
        text: "Visit my shop",
    }),
    css: `.b-btn.alt{background:var(--card);color:var(--cardfg)!important;border:var(--line-b,1px solid var(--line))}`,
    render: (block, ctx) =>
        ctx.editable || (block.text && block.url)
            ? `<a class="b-btn${block.variant === "outline" ? " alt" : ""}" href="${safeHref(block.url)}">${editableText(ctx, "span", "text", block.text)}</a>`
            : "",
});
