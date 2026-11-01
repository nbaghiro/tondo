import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { list, text } from "../fields";
import { item } from "./parts";

export const stats = defineBlock({
    schema: blockSchema("stats", ["row"], {
        items: z.array(item({ number: z.string().max(8), label: z.string().max(18) })).max(4),
    }),
    name: "Numbers",
    group: "details",
    layouts: { row: { label: "Row" } },
    fields: [
        list("items", "Numbers", {
            title: "label",
            add: "Add a number",
            max: 4,
            fields: [
                text("number", "Number", { max: 8 }),
                text("label", "What it counts", { max: 18 }),
            ],
            make: () => ({ number: "10", label: "Things" }),
        }),
    ],
    make: () => ({
        type: "stats" as const,
        variant: "row" as const,
        items: [
            { id: "a", number: "120+", label: "Clients" },
            { id: "b", number: "8", label: "Years" },
            { id: "c", number: "4.8", label: "Rating" },
        ],
    }),
    css: `.b-stats{display:flex;margin-top:14px;border-block:1px solid var(--line)}.b-stats div{flex:1;min-width:0;text-align:center;padding:12px 4px}.b-stats div+div{border-left:1px solid var(--line)}.b-stats b{display:block;font:var(--dw,500) 25px/1.1 var(--disp)}.b-stats small{display:block;font-size:12.5px;color:var(--mut);margin-top:2px}`,
    render: (block, ctx) =>
        block.items.length
            ? `<div class="b-stats">${block.items
                  .map(
                      (entry, i) =>
                          `<div>${editableText(ctx, "b", `items.${String(i)}.number`, entry.number)}${editableText(ctx, "small", `items.${String(i)}.label`, entry.label)}</div>`,
                  )
                  .join("")}</div>`
            : "",
});
