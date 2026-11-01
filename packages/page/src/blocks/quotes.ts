import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { list, longText, text } from "../fields";
import { item } from "./parts";

export const quotes = defineBlock({
    schema: blockSchema("quotes", ["large", "card", "carousel"], {
        items: z
            .array(item({ text: z.string().max(180), by: z.string().max(50).optional() }))
            .max(12),
    }),
    name: "Quotes",
    group: "details",
    layouts: {
        large: { label: "Large" },
        card: { label: "Card" },
        carousel: { label: "Carousel" },
    },
    fields: [
        list("items", "Quotes", {
            title: "text",
            add: "Add a quote",
            max: 12,
            hint: "Only use real words, from people who agreed to be quoted.",
            fields: [
                longText("text", "What they said", { max: 180 }),
                text("by", "Who said it", { max: 50 }),
            ],
            make: () => ({ text: "" }),
        }),
    ],
    make: () => ({
        type: "quotes" as const,
        variant: "large" as const,
        items: [
            { id: "a", text: "The only mug I reach for every morning.", by: "Dana, customer" },
            { id: "b", text: "Friendly, careful and always on time.", by: "Mel, customer" },
        ],
    }),
    css: `.b-quote{margin:18px 0 0;font:var(--dw,500) 20px/1.32 var(--disp);text-align:var(--hal,left)}.b-quote small{display:block;font:500 13.5px var(--body);color:var(--mut);margin-top:9px}.b-quote-card{background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:16px;margin-top:10px;font-size:18px;box-shadow:var(--sh,none)}.b-quote-card small{color:inherit;opacity:.72}
.b-revs{display:flex;gap:10px;overflow-x:auto;margin:10px -18px 0;padding:0 18px 4px;scrollbar-width:none;scroll-snap-type:x proximity}.b-revs figure{flex:0 0 78%;scroll-snap-align:center;margin:0;background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:15px}.b-revs blockquote{margin:0 0 8px;line-height:1.35}.b-revs figcaption{font-size:13px;opacity:.72}`,
    render: (block, ctx) => {
        const said = block.items.filter((entry) => entry.text || ctx.editable);
        if (!said.length) return "";
        const words = said.map((entry) => {
            const i = String(block.items.indexOf(entry));
            return block.variant === "carousel"
                ? `<figure>${editableText(ctx, "blockquote", `items.${i}.text`, entry.text)}${editableText(ctx, "figcaption", `items.${i}.by`, entry.by)}</figure>`
                : `<blockquote class="b-quote${block.variant === "card" ? " b-quote-card" : ""}">${editableText(ctx, "span", `items.${i}.text`, entry.text)}${editableText(ctx, "small", `items.${i}.by`, entry.by)}</blockquote>`;
        });
        return block.variant === "carousel"
            ? `<div class="b-revs">${words.join("")}</div>`
            : words.join("");
    },
});
