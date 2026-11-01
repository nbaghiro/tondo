import { z } from "zod";
import { blockSchema, defineBlock, editableText } from "../define-block";
import { list, text } from "../fields";
import { item } from "./parts";

export const timeline = defineBlock({
    schema: blockSchema("timeline", ["line"], {
        items: z
            .array(
                item({
                    title: z.string().max(50),
                    date: z.string().max(24).optional(),
                    detail: z.string().max(90).optional(),
                }),
            )
            .max(12),
    }),
    name: "Timeline",
    group: "details",
    layouts: { line: { label: "Line" } },
    fields: [
        list("items", "Entries", {
            title: "title",
            add: "Add an entry",
            max: 12,
            fields: [
                text("title", "Title", { max: 50 }),
                text("date", "Date", { max: 24 }),
                text("detail", "Details", { max: 90 }),
            ],
            make: () => ({ title: "New entry" }),
        }),
    ],
    make: () => ({
        type: "timeline" as const,
        variant: "line" as const,
        items: [
            {
                id: "a",
                date: "2022 to now",
                title: "Freelance",
                detail: "Small design systems",
            },
            {
                id: "b",
                date: "2017 to 2022",
                title: "Design lead, Northway",
                detail: "Grew the team to nine",
            },
        ],
    }),
    css: `.b-line{list-style:none;margin:12px 0 0;padding:0 0 0 18px;border-left:2px solid var(--line)}.b-line li{position:relative;padding-bottom:16px}.b-line li:last-child{padding-bottom:2px}.b-line li::before{content:"";position:absolute;left:-24px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--acc)}.b-line small{display:block;font-size:13px;color:var(--mut)}.b-line b{display:block;line-height:1.25}.b-line span{display:block;font-size:14px;color:var(--mut)}`,
    render: (block, ctx) =>
        block.items.length
            ? `<ol class="b-line">${block.items
                  .map((entry, i) => {
                      const at = `items.${String(i)}`;
                      return `<li>${editableText(ctx, "small", `${at}.date`, entry.date)}${editableText(ctx, "b", `${at}.title`, entry.title)}${editableText(ctx, "span", `${at}.detail`, entry.detail)}</li>`;
                  })
                  .join("")}</ol>`
            : "",
});
