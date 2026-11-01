import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    linkValue,
    safeHref,
} from "../define-block";
import { link, text } from "../fields";

const WEEKEND = new Set([4, 5, 11, 12, 18, 19, 25, 26]);

export const booking = defineBlock({
    schema: blockSchema("booking", ["card", "calendar", "slots"], {
        url: linkValue,
        title: z.string().max(50),
        sub: z.string().max(60).optional(),
        cta: z.string().max(24).optional(),
        /** Times to show, for the time slots layout that Tondo booking will fill in. */
        slots: z.array(z.string().max(12)).max(12).optional(),
    }),
    name: "Booking",
    group: "selling",
    layouts: {
        card: { label: "Card" },
        calendar: { label: "Inline calendar", held: true },
        slots: { label: "Time slots", held: true },
    },
    fields: [
        link("url", "Your booking page", { fills: "title" }),
        text("title", "Title", { max: 50, inline: true }),
        text("sub", "Short line", { max: 60, inline: true }),
        text("cta", "Button text", { max: 24, inline: true }),
    ],
    make: () => ({
        type: "booking" as const,
        variant: "card" as const,
        url: "",
        title: "Book a free 20-minute call",
        sub: "I'll reply the same day",
        cta: "Book a time",
        slots: ["9:00 am", "11:30 am", "2:00 pm", "3:30 pm", "4:15 pm", "5:00 pm"],
    }),
    css: `.b-book{background:var(--card);color:var(--cardfg);border-radius:var(--r);border:var(--line-b,1px solid var(--line));padding:15px;margin-top:10px;box-shadow:var(--sh,none)}.b-book>b{display:block;font:var(--dw,500) 18px/1.2 var(--disp)}.b-book>small{display:block;font-size:13.5px;opacity:.76;margin-top:3px}.b-book>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:11px}.b-book>div a{text-align:center;font-size:13.5px;font-weight:600;padding:9px 2px;border:1px solid currentColor;border-radius:calc(var(--r)/2)}.b-book>div a.on{background:var(--btn);color:var(--btnfg);border-color:var(--btn)}.b-book .b-btn{display:block;margin-top:11px}.b-book>.b-cal{grid-template-columns:repeat(7,1fr);gap:3px;margin-top:9px}.b-cal i{font-style:normal;text-align:center;font-size:13px;padding:6px 0;border-radius:50%;opacity:.35}.b-cal i.open{opacity:1;font-weight:600}.b-cal i.on{background:var(--btn);color:var(--btnfg)}`,
    render: (block, ctx) => {
        const words = `${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}`;
        const button =
            block.url || ctx.editable
                ? `<a class="b-btn b-sm" href="${safeHref(block.url)}">${editableText(ctx, "span", "cta", block.cta)}</a>`
                : "";
        if (block.variant === "calendar") {
            const days = Array.from(
                { length: 30 },
                (_, i) =>
                    `<i class="${WEEKEND.has(i) ? "" : "open"}${i === 9 ? " on" : ""}">${String(i + 1)}</i>`,
            ).join("");
            return `<div class="b-book">${words}<div class="b-cal">${days}</div>${button}</div>`;
        }
        if (block.variant === "slots") {
            const times = (block.slots ?? []).map(
                (time, i) => `<a href="#" class="${i === 1 ? "on" : ""}">${escapeHtml(time)}</a>`,
            );
            return `<div class="b-book">${words}<div>${times.join("")}</div>${button}</div>`;
        }
        return `<div class="b-book">${words}${button}</div>`;
    },
});
