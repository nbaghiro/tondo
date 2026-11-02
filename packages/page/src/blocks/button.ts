import { z } from "zod";
import { blockSchema, defineBlock, editableText, linkValue, safeHref } from "../define-block";
import { link, text } from "../fields";

const ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14M13 6l6 6-6 6'/%3E%3C/svg%3E")`;

/** Words on the left and whatever follows them on the right. */
export const buttonWordsLeft = (sel: string) =>
    `${sel}{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}`;

export const buttonArrow = (sel: string) =>
    `${sel}{display:flex;align-items:center;gap:12px}${sel}::after{content:"";flex:none;width:18px;height:18px;background:currentColor;-webkit-mask:${ARROW} center/contain no-repeat;mask:${ARROW} center/contain no-repeat}`;

const TINT = "color-mix(in srgb,var(--acc) 10%,var(--bg))";
const HAIRLINE = "1px solid color-mix(in srgb,var(--fg) 18%,transparent)";

/** How a regular button looks in each style, for a whole page or one section. */
export function buttonStyleCss(sel: string, style: "soft" | "rows" | "card"): string {
    if (style === "soft") {
        return `${sel}{background:${TINT}!important;color:var(--fg)!important;border:0!important;box-shadow:none!important}`;
    }
    if (style === "rows") {
        return `${buttonWordsLeft(sel)}${buttonArrow(sel)}${sel}{background:none!important;color:var(--fg)!important;border:0!important;border-bottom:${HAIRLINE}!important;border-radius:0!important;padding:15px 2px;margin-top:0;box-shadow:none!important}${sel}::after{color:var(--acc)}`;
    }
    return `${buttonWordsLeft(sel)}${buttonArrow(sel)}${sel}{background:var(--card)!important;color:var(--cardfg)!important;border:${HAIRLINE}!important;padding:9px 9px 9px 16px;margin-top:8px;box-shadow:none!important}${sel}::before{content:"";order:1;flex:none;width:34px;height:34px;border-radius:50%;background:var(--btn)}${sel}::after{position:absolute;right:17px;color:var(--btnfg)}${sel}{position:relative}`;
}

const VARIANTS = ["soft", "rows", "card"] as const;

export const button = defineBlock({
    schema: blockSchema("button", ["filled", "outline", ...VARIANTS], {
        url: linkValue,
        text: z.string().max(40),
    }),
    name: "Button",
    group: "actions",
    layouts: {
        filled: { label: "Filled" },
        outline: { label: "Outline" },
        soft: { label: "Soft" },
        rows: { label: "Rows" },
        card: { label: "Card" },
    },
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
    css: `.b-btn.alt{background:var(--card);color:var(--cardfg)!important;border:var(--line-b,1px solid var(--line))}${VARIANTS.map((v) => buttonStyleCss(`.b-btn.b-${v}`, v)).join("")}${buttonWordsLeft(".b-btn.b-soft")}${buttonArrow(".b-btn.b-soft")}`,
    render: (block, ctx) =>
        ctx.editable || (block.text && block.url)
            ? `<a class="b-btn${block.variant === "outline" ? " alt" : block.variant === "filled" ? "" : ` b-${block.variant}`}" href="${safeHref(block.url)}">${editableText(ctx, "span", "text", block.text)}</a>`
            : "",
});
