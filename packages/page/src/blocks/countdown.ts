import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { dateTime, text } from "../fields";
import { daysFromNow, daysUntil, localTime } from "./parts";

export const countdown = defineBlock({
    schema: blockSchema("countdown", ["large", "inline"], {
        at: localTime.optional(),
        label: z.string().max(40).optional(),
        done: z.string().max(50).optional(),
    }),
    name: "Countdown",
    group: "selling",
    layouts: { large: { label: "Large" }, inline: { label: "Inline" } },
    fields: [
        dateTime("at", "Counting down to", { local: true }),
        text("label", "Label", { max: 40, inline: true }),
        text("done", "Message once it's over", {
            max: 50,
            more: true,
            hint: "Leave this empty to hide the block when it's over.",
        }),
    ],
    make: () => ({
        type: "countdown" as const,
        variant: "large" as const,
        at: daysFromNow(30),
        label: "The winter drop opens in",
    }),
    css: `.b-count{margin-top:14px;text-align:center;background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:18px;box-shadow:var(--sh,none)}.b-count small{font-size:14px;font-weight:600}.b-count div{display:flex;justify-content:center;align-items:baseline;gap:8px}.b-count b{font:var(--dw,500) 70px/1.05 var(--disp)}.b-count span{font-size:17px}
.b-countline{display:flex;gap:10px;align-items:center;margin-top:12px;padding:10px 14px;background:var(--acc);color:var(--ribfg,#fff);border-radius:var(--r)}.b-countline b{white-space:nowrap;font-size:17px}.b-countline span{font-size:14px;line-height:1.25}`,
    render: (block, ctx) => {
        if (!block.at) return "";
        const days = daysUntil(block.at, ctx.now ?? new Date(), ctx.timeZone);
        if (days <= 0) {
            return block.done
                ? `<div class="b-countline"><b>${escapeHtml(block.done)}</b></div>`
                : "";
        }
        const unit = days === 1 ? "day" : "days";
        return block.variant === "inline"
            ? `<div class="b-countline"><b>${String(days)} ${unit}</b>${editableText(ctx, "span", "label", block.label)}</div>`
            : `<div class="b-count">${editableText(ctx, "small", "label", block.label)}<div><b>${String(days)}</b><span>${unit}</span></div></div>`;
    },
});
