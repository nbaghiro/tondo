import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    linkValue,
    linkOr,
    safeHref,
} from "../define-block";
import { dateTime, link, list, text } from "../fields";
import { dateTile, daysFromNow, daysUntil, item, localTime } from "./parts";

const isSchedule = (values: Readonly<Record<string, unknown>>) => values["variant"] === "schedule";

export const events = defineBlock({
    schema: blockSchema("events", ["list", "next", "schedule"], {
        items: z
            .array(
                item({
                    name: z.string().max(50),
                    at: localTime.optional(),
                    label: z.string().max(14).optional(),
                    place: z.string().max(50).optional(),
                    url: linkValue,
                }),
            )
            .max(30),
        cta: z.string().max(12).optional(),
    }),
    name: "Events",
    group: "selling",
    layouts: {
        list: { label: "List" },
        next: { label: "Next one only" },
        schedule: { label: "Schedule" },
    },
    fields: [
        list("items", "Events", {
            title: "name",
            add: "Add an event",
            max: 30,
            hint: "Past events drop off the page by themselves.",
            fields: [
                text("name", "Name", { max: 50 }),
                dateTime("at", "Date and time", {
                    local: true,
                    when: (values) => !isSchedule(values),
                }),
                text("label", "Time or day", { max: 14, when: isSchedule }),
                text("place", "Place or detail", { max: 50 }),
                link("url", "Ticket or booking link"),
            ],
            make: () => ({ name: "New event", url: "", at: daysFromNow(14) }),
        }),
        text("cta", "Button text", { max: 12, more: true }),
    ],
    make: () => ({
        type: "events" as const,
        variant: "list" as const,
        cta: "Tickets",
        items: [
            {
                id: "a",
                name: "Halifax",
                place: "The Old Mill",
                label: "9:30 am",
                at: daysFromNow(20),
                url: "",
            },
            {
                id: "b",
                name: "Toronto",
                place: "Harbour Hall",
                label: "1:00 pm",
                at: daysFromNow(27),
                url: "",
            },
            {
                id: "c",
                name: "Montreal",
                place: "The Long Room",
                label: "6:30 pm",
                at: daysFromNow(34),
                url: "",
            },
        ],
    }),
    css: `.b-ev{display:grid;grid-template-columns:50px 1fr auto;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.b-date{display:block;text-align:center;line-height:1.05}.b-date small{display:block;font-size:12px;font-weight:700;color:var(--acc)}.b-date b{font:var(--dw,500) 24px var(--disp)}.b-et b{display:block;line-height:1.25}.b-et small{display:block;font-size:13.5px;color:var(--mut)}
.b-evnext{display:grid;grid-template-columns:auto 1fr;gap:15px;align-items:center;margin-top:10px;padding:16px;background:var(--card);color:var(--cardfg)!important;border:var(--line-b,1px solid var(--line));border-radius:var(--r);box-shadow:var(--sh,none)}.b-evnext .b-date b{font-size:44px}.b-evnext .b-date small{font-size:14px}.b-evnext .b-et>b{font:var(--dw,500) 21px/1.2 var(--disp)}.b-evnext .b-et small{color:inherit;opacity:.76}.b-evnext .b-btn{grid-column:1/-1;display:block;margin-top:0}
.b-sched{margin-top:8px}.b-sched div{display:grid;grid-template-columns:70px 1fr auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.b-sched time{font-weight:700;font-size:14.5px}.b-sched b{display:block;line-height:1.2}.b-sched small{font-size:13px;color:var(--mut)}`,
    render: (block, ctx) => {
        const now = ctx.now ?? new Date();
        // In the editor every event stays, so a past one can still be changed.
        const showing = block.items
            .map((entry, i) => ({ entry, i }))
            .filter(
                ({ entry }) =>
                    ctx.editable ||
                    block.variant === "schedule" ||
                    !entry.at ||
                    daysUntil(entry.at, now, ctx.timeZone) >= 0,
            );
        const first = showing[0];
        if (!first) return "";
        const cta = escapeHtml(block.cta ?? "");
        const words = ({ entry, i }: typeof first) =>
            `${editableText(ctx, "b", `items.${String(i)}.name`, entry.name)}${editableText(ctx, "small", `items.${String(i)}.place`, entry.place)}`;
        if (block.variant === "next") {
            const button = cta && first.entry.url ? `<span class="b-btn b-sm">${cta}</span>` : "";
            return linkOr(
                ctx,
                first.entry.url,
                "b-evnext",
                `${dateTile(first.entry.at)}<span class="b-et">${words(first)}</span>${button}`,
            );
        }
        if (block.variant === "schedule") {
            const rows = showing.map(
                (row) =>
                    `<div><time>${escapeHtml(row.entry.label ?? "")}</time><span>${words(row)}</span>${row.entry.url && cta ? `<a class="b-chip" href="${safeHref(row.entry.url)}">${cta}</a>` : ""}</div>`,
            );
            return `<div class="b-sched">${rows.join("")}</div>`;
        }
        const rows = showing.map((row) =>
            linkOr(
                ctx,
                row.entry.url,
                "b-ev",
                `${dateTile(row.entry.at)}<span class="b-et">${words(row)}</span>${cta && row.entry.url ? `<span class="b-chip">${cta}</span>` : ""}`,
            ),
        );
        return `<div class="b-events">${rows.join("")}</div>`;
    },
});
