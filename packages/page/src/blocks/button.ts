import { z } from "zod";
import { blockSchema, defineBlock, editableText, linkValue, safeHref } from "../define-block";
import { link, text } from "../fields";

export const button = defineBlock({
    schema: blockSchema("button", ["filled", "outline"], {
        text: z.string().max(120),
        url: linkValue,
    }),
    name: "Button",
    group: "actions",
    variantLabels: { filled: "Filled", outline: "Outline" },
    fields: [text("text", "Text"), link("url", "Link")],
    make: () => ({
        type: "button" as const,
        variant: "filled" as const,
        text: "Visit my website",
        url: "",
    }),
    css: `.b-btn{display:block;text-align:center;font-weight:600;padding:14px 18px;margin-top:10px;background:var(--btn);color:var(--btnfg)!important;border-radius:var(--rb);border:var(--bb,0)}.b-btn-outline{background:var(--card);color:var(--cardfg)!important;border:var(--line-b,1px solid var(--line))}`,
    render: (block, ctx) =>
        `<a class="b-btn${block.variant === "outline" ? " b-btn-outline" : ""}" href="${safeHref(block.url)}">${editableText(ctx, "span", "text", block.text)}</a>`,
});
