import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { text } from "../fields";

export const ribbon = defineBlock({
    schema: blockSchema("ribbon", ["moving", "still"], { text: z.string().max(60) }),
    name: "Ribbon",
    group: "words",
    layouts: { moving: { label: "Moving" }, still: { label: "Still" } },
    fields: [text("text", "Message", { max: 60 })],
    make: () => ({
        type: "ribbon" as const,
        variant: "moving" as const,
        text: "New work on Friday",
    }),
    css: `.b-rib{overflow:hidden;margin:20px -18px 2px;background:var(--acc);color:var(--ribfg,#fff);font-weight:700;padding:9px 0;transform:rotate(-1.5deg) scale(1.02)}.b-rib>div{display:flex;width:max-content;align-items:center;gap:14px;animation:rib 26s linear infinite}.b-rib i{width:8px;height:8px;border-radius:50%;background:currentColor}@keyframes rib{to{transform:translateX(-50%)}}.b-rib-still{transform:none;text-align:center;padding-inline:18px}@media(prefers-reduced-motion:reduce){.b-rib>div{animation:none}}`,
    render: (block, ctx) => {
        if (!block.text) return "";
        if (block.variant === "still") {
            return `<div class="b-rib b-rib-still">${editableText(ctx, "span", "text", block.text)}</div>`;
        }
        const words = escapeHtml(block.text);
        const run = `<span>${words}</span><i></i>`.repeat(12);
        return `<div class="b-rib" role="img" aria-label="${words}"><div>${run}</div></div>`;
    },
});
