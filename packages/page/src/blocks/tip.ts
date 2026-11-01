import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { list, text } from "../fields";
import { cardCss, item } from "./parts";

// Needs payments. Saved pages can hold it, but it stays out of the shelf until they exist.
export const tip = defineBlock({
    schema: blockSchema("tip", ["amounts", "single"], {
        title: z.string().max(40),
        sub: z.string().max(70).optional(),
        amounts: z
            .array(item({ amount: z.string().max(6) }))
            .max(4)
            .optional(),
        cta: z.string().max(24).optional(),
        raised: z.string().max(14).optional(),
        goal: z.string().max(14).optional(),
        progress: z.number().min(0).max(100).optional(),
    }),
    name: "Tip",
    group: "selling",
    held: true,
    layouts: { amounts: { label: "Amounts" }, single: { label: "Single button" } },
    fields: [
        text("title", "Title", { max: 40, inline: true }),
        text("sub", "Short line", { max: 70, inline: true }),
        list("amounts", "Amounts", {
            title: "amount",
            add: "Add an amount",
            max: 4,
            when: (values) => values["variant"] === "amounts",
            fields: [text("amount", "Amount", { max: 6 })],
            make: () => ({ amount: "$25" }),
        }),
        text("cta", "Button text", { max: 24 }),
        text("raised", "Raised so far", { max: 14, more: true }),
        text("goal", "Goal", { max: 14, more: true }),
    ],
    make: () => ({
        type: "tip" as const,
        variant: "amounts" as const,
        title: "Buy me a coffee",
        sub: "It keeps the kiln running.",
        cta: "Send a tip",
        amounts: [
            { id: "a", amount: "$3" },
            { id: "b", amount: "$5" },
            { id: "c", amount: "$10" },
            { id: "d", amount: "$20" },
        ],
    }),
    css: `.b-tip,.b-prog{${cardCss};padding:15px;margin-top:10px}.b-tip>b{display:block;font:var(--dw,500) 18px/1.2 var(--disp)}.b-tip>small{display:block;font-size:13.5px;opacity:.76;margin-top:3px}.b-tip>div{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:11px}.b-tip>div a{text-align:center;font-weight:600;padding:10px 2px;border:1px solid currentColor;border-radius:calc(var(--r)/2)}.b-tip>div a.on{background:var(--btn);color:var(--btnfg);border-color:var(--btn)}.b-tip .b-btn{display:block}.b-prog>div{display:flex;align-items:baseline;gap:7px}.b-prog b{font:var(--dw,500) 30px/1.1 var(--disp)}.b-prog span{font-size:14px;opacity:.76}.b-prog i{display:block;height:10px;border-radius:9px;background:var(--line);margin:9px 0 0;overflow:hidden}.b-prog u{display:block;height:100%;background:var(--acc);border-radius:9px}`,
    render: (block, ctx) => {
        const goal =
            block.raised && block.goal
                ? `<div class="b-prog"><div><b>${escapeHtml(block.raised)}</b><span>of ${escapeHtml(block.goal)}</span></div><i><u style="width:${String(block.progress ?? 50)}%"></u></i></div>`
                : "";
        if (block.variant === "single") {
            return `${goal}<a class="b-btn" href="#">${editableText(ctx, "span", "title", block.title)}</a>`;
        }
        const amounts = (block.amounts ?? []).map(
            (entry, i) =>
                `<a href="#" class="${i === 1 ? "on" : ""}">${escapeHtml(entry.amount)}</a>`,
        );
        return `${goal}<div class="b-tip">${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}<div>${amounts.join("")}</div><span class="b-btn b-sm">${escapeHtml(block.cta ?? "")}</span></div>`;
    },
});
