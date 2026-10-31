import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { longText } from "../fields";

// Saved pages hold plain words, never HTML. Addresses become links when the page is drawn.
const ADDRESS = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g;
const linkify = (value: string) =>
    escapeHtml(value).replace(
        ADDRESS,
        (url) => `<a href="${url}" rel="noopener">${url.replace(/^https?:\/\//, "")}</a>`,
    );

export const text = defineBlock({
    schema: blockSchema("text", ["plain", "card"], { text: z.string().max(600) }),
    name: "Text",
    group: "words",
    layouts: { plain: { label: "Plain" }, card: { label: "Card" } },
    fields: [
        longText("text", "Text", {
            max: 600,
            inline: true,
            hint: "Web addresses become links by themselves.",
        }),
    ],
    make: () => ({
        type: "text" as const,
        variant: "plain" as const,
        text: "A few words about what you do, and who it's for.",
    }),
    css: `.b-text{margin:12px 0 0;white-space:pre-line}.look .b-text a{text-decoration:underline}.b-text-card{background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:14px 15px}`,
    render: (block, ctx) => {
        const cls = block.variant === "card" ? "b-text b-text-card" : "b-text";
        if (ctx.editable) return editableText(ctx, "p", "text", block.text, cls);
        return block.text ? `<p class="${cls}">${linkify(block.text)}</p>` : "";
    },
});
