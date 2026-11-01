import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { list, text } from "../fields";
import { icon } from "../icons";
import { item } from "./parts";

const directions = (address: string) =>
    escapeHtml(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);

// The map is a drawing in the look's colours that opens directions, not a real map.
const MAP = `<svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="170" class="m-l"/><path d="M-10 128C70 108 120 150 210 122S340 96 410 118V180H-10Z" class="m-w"/><g fill="none" class="m-r"><path stroke-width="7" d="M-5 58H405M92-5 132 175M278-5V175"/><path stroke-width="3" d="M-5 24H405M-5 92H405M190-5 205 175M345-5V175M38-5 50 175"/></g><circle cx="205" cy="74" r="20" class="m-p" opacity=".24"/><circle cx="205" cy="74" r="8" class="m-p"/></svg>`;

export const location = defineBlock({
    schema: blockSchema("location", ["hours", "map", "both"], {
        address: z.string().max(70),
        note: z.string().max(50).optional(),
        hours: z
            .array(item({ days: z.string().max(18), time: z.string().max(22) }))
            .max(7)
            .optional(),
    }),
    name: "Location",
    group: "details",
    layouts: { hours: { label: "Hours" }, map: { label: "Map" }, both: { label: "Both" } },
    fields: [
        text("address", "Address", {
            max: 70,
            inline: true,
            hint: "Tondo adds the directions link from this.",
        }),
        text("note", "Short note", { max: 50, inline: true }),
        list("hours", "Opening hours", {
            title: "days",
            add: "Add a row",
            max: 7,
            when: (values) => values["variant"] !== "map",
            fields: [text("days", "Days", { max: 18 }), text("time", "Hours", { max: 22 })],
            make: () => ({ days: "", time: "" }),
        }),
    ],
    make: () => ({
        type: "location" as const,
        variant: "both" as const,
        address: "42 Water Street, Halifax",
        note: "Open today until 3 pm",
        hours: [
            { id: "a", days: "Tue to Fri", time: "7 am to 3 pm" },
            { id: "b", days: "Sat and Sun", time: "8 am to 2 pm" },
            { id: "c", days: "Mon", time: "Closed" },
        ],
    }),
    css: `.b-hours{background:var(--card);color:var(--cardfg);border-radius:var(--r);border:var(--line-b,1px solid var(--line));padding:15px;margin-top:10px;box-shadow:var(--sh,none)}.b-hours dl{margin:0}.b-hours dl div{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)}.b-hours dt{font-weight:600}.b-hours dd{margin:0}.b-hours a{display:flex;gap:7px;align-items:center;margin-top:11px;font-weight:600;font-size:14.5px}.b-hours .ic{width:20px;height:20px;flex:none}
.b-map{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin-top:10px;background:var(--card);color:var(--cardfg)!important;border:var(--line-b,1px solid var(--line));border-radius:var(--r);overflow:hidden;padding-bottom:12px;box-shadow:var(--sh,none)}.b-map svg{grid-column:1/-1;display:block;width:100%;height:150px}.b-map>span:nth-child(2){padding-left:14px;min-width:0}.b-map b{display:block;line-height:1.2}.b-map small{font-size:13px;opacity:.72}.b-map .b-chip{margin-right:12px}.m-l{fill:color-mix(in srgb,var(--acc) 12%,var(--card))}.m-w{fill:color-mix(in srgb,var(--acc) 26%,var(--card))}.m-r{stroke:var(--card)}.m-p{fill:var(--acc)}`,
    render: (block, ctx) => {
        if (!block.address && !ctx.editable) return "";
        const href = directions(block.address);
        const place = editableText(ctx, "b", "address", block.address);
        const map = `<a class="b-map" href="${href}">${MAP}<span>${place}${editableText(ctx, "small", "note", block.note)}</span><span class="b-chip">Directions</span></a>`;
        const rows = (block.hours ?? []).map(
            (row, i) =>
                `<div>${editableText(ctx, "dt", `hours.${String(i)}.days`, row.days)}${editableText(ctx, "dd", `hours.${String(i)}.time`, row.time)}</div>`,
        );
        const footer =
            block.variant === "both"
                ? ""
                : `<a href="${href}">${icon("pin")}<span>${place}</span></a>`;
        const hours = `<div class="b-hours"><dl>${rows.join("")}</dl>${footer}</div>`;
        return block.variant === "map" ? map : block.variant === "hours" ? hours : map + hours;
    },
});
