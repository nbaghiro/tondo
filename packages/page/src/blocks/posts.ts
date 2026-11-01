import { z } from "zod";
import { blockSchema, defineBlock, editableText, linkOr, linkValue } from "../define-block";
import { choice, link, list, source, text } from "../fields";
import { cardCss, item } from "./parts";

export const posts = defineBlock({
    schema: blockSchema("posts", ["list", "cards"], {
        source: z.enum(["manual", "rss"]).optional(),
        items: z
            .array(
                item({
                    title: z.string().max(70),
                    date: z.string().max(20).optional(),
                    text: z.string().max(90).optional(),
                    url: linkValue,
                }),
            )
            .max(10),
        count: z.enum(["3", "5", "10"]).optional(),
    }),
    name: "Posts",
    group: "media",
    layouts: { list: { label: "List" }, cards: { label: "Cards" } },
    fields: [
        source("source", "Where it comes from", {
            options: [
                { value: "manual", label: "Typed in" },
                { value: "rss", label: "Blog or podcast feed", held: true },
            ],
        }),
        list("items", "Posts", {
            title: "title",
            add: "Add a post",
            max: 10,
            when: (values) => (values["source"] ?? "manual") === "manual",
            fields: [
                link("url", "Link", { fills: "title" }),
                text("title", "Title", { max: 70 }),
                text("date", "Date", { max: 20 }),
                text("text", "Description", { max: 90 }),
            ],
            make: () => ({ title: "New post", url: "" }),
        }),
        choice("count", "How many to show", {
            options: [
                ["3", "3"],
                ["5", "5"],
                ["10", "10"],
            ],
            when: (values) => (values["source"] ?? "manual") !== "manual",
        }),
    ],
    make: () => ({
        type: "posts" as const,
        variant: "list" as const,
        items: [
            {
                id: "a",
                title: "What a failed firing teaches you",
                date: "October 22",
                text: "The kiln ran hot, and most of it survived.",
                url: "",
            },
            { id: "b", title: "Choosing a first clay", date: "October 8", url: "" },
        ],
    }),
    css: `.b-posts>*{display:block;padding:12px 0;border-bottom:1px solid var(--line)}.b-posts small{display:block;font-size:13px;color:var(--mut)}.b-posts b{display:block;font:var(--dw,500) 18px/1.25 var(--disp)}.b-posts span{display:block;font-size:14.5px;color:var(--mut);margin-top:2px}.b-posts-c{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.b-posts-c>*{display:block;padding:13px;${cardCss};color:var(--cardfg)!important}.b-posts-c small,.b-posts-c span{display:block;font-size:13px;opacity:.72}.b-posts-c b{display:block;margin:3px 0;font:var(--dw,500) 16px/1.2 var(--disp)}`,
    render: (block, ctx) => {
        if (!block.items.length) return "";
        const rows = block.items.map((entry, i) => {
            const at = `items.${String(i)}`;
            return linkOr(
                ctx,
                entry.url,
                "",
                `${editableText(ctx, "small", `${at}.date`, entry.date)}${editableText(ctx, "b", `${at}.title`, entry.title)}${editableText(ctx, "span", `${at}.text`, entry.text)}`,
            );
        });
        return `<div class="${block.variant === "cards" ? "b-posts-c" : "b-posts"}">${rows.join("")}</div>`;
    },
});
