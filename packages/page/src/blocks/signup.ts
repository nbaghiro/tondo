import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { text } from "../fields";

// Needs sign-ups stored and email sent. It stays out of the shelf until they exist.
export const signup = defineBlock({
    schema: blockSchema("signup", ["card", "plain"], {
        title: z.string().max(40),
        sub: z.string().max(120).optional(),
        cta: z.string().max(14).optional(),
    }),
    name: "Email sign-up",
    group: "collecting",
    held: true,
    layouts: { card: { label: "Card" }, plain: { label: "Plain" } },
    fields: [
        text("title", "Title", { max: 40, inline: true }),
        text("sub", "What people get", { max: 120, inline: true }),
        text("cta", "Button text", { max: 14 }),
    ],
    make: () => ({
        type: "signup" as const,
        variant: "card" as const,
        title: "A note now and then",
        sub: "News and dates, about once a month.",
        cta: "Join",
    }),
    css: `.b-form{background:var(--card);color:var(--cardfg);border-radius:var(--r);border:var(--line-b,1px solid var(--line));padding:15px;margin-top:10px;box-shadow:var(--sh,none)}.b-form>b{display:block;font:var(--dw,500) 18px/1.2 var(--disp)}.b-form>small{display:block;font-size:13.5px;opacity:.76;margin-top:3px}.b-form div{display:flex;gap:6px;margin-top:11px}.b-form input{flex:1;min-width:0;font:inherit;color:inherit;padding:11px 13px;background:transparent;border:1px solid currentColor;border-radius:var(--rb)}.b-form input::placeholder{color:inherit;opacity:.65}.b-form button{font:600 14.5px var(--body);padding:0 16px;border:0;background:var(--btn);color:var(--btnfg);border-radius:var(--rb);cursor:pointer}.b-form-plain{background:none;color:inherit;border:0;box-shadow:none;padding:0;margin-top:16px}`,
    render: (block, ctx) =>
        `<form class="b-form${block.variant === "plain" ? " b-form-plain" : ""}" action="#">${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}<div><input type="email" aria-label="Your email" placeholder="Your email"><button type="button">${escapeHtml(block.cta ?? "Join")}</button></div></form>`,
});
