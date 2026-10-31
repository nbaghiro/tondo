import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { text } from "../fields";

export const heading = defineBlock({
    schema: blockSchema("heading", ["plain", "large"], { text: z.string().max(120) }),
    name: "Heading",
    group: "words",
    variantLabels: { plain: "Plain", large: "Large" },
    fields: [text("text", "Text")],
    make: () => ({ type: "heading" as const, variant: "plain" as const, text: "A new section" }),
    css: `.b-head{font:var(--dw,500) 21px/1.2 var(--disp);margin:28px 0 2px;text-align:var(--hal,left)}.b-head-large{font-size:28px}`,
    render: (block, ctx) =>
        editableText(
            ctx,
            "h2",
            "text",
            block.text,
            block.variant === "large" ? "b-head b-head-large" : "b-head",
        ),
});
