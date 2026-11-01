import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    linkValue,
    photoTag,
    photoValue,
    linkOr,
} from "../define-block";
import { link, list, photo, source, text } from "../fields";
import { icon } from "../icons";
import { item, videoCss } from "./parts";

export const video = defineBlock({
    schema: blockSchema("video", ["card", "vertical", "row"], {
        source: z.enum(["manual", "youtube", "tiktok"]).optional(),
        items: z
            .array(
                item({
                    url: linkValue,
                    title: z.string().max(70),
                    meta: z.string().max(24).optional(),
                    cover: photoValue.optional(),
                }),
            )
            .max(8),
    }),
    name: "Video",
    group: "media",
    layouts: {
        card: { label: "Card" },
        vertical: { label: "Vertical" },
        row: { label: "Row" },
    },
    fields: [
        source("source", "Where it comes from", {
            options: [
                { value: "manual", label: "A video link" },
                { value: "youtube", label: "My YouTube", held: true },
                { value: "tiktok", label: "My TikTok", held: true },
            ],
        }),
        list("items", "Videos", {
            title: "title",
            add: "Add a video",
            max: 8,
            hint: "Card shows the first one.",
            fields: [
                link("url", "Video link", { fills: "title" }),
                text("title", "Title", { max: 70 }),
                text("meta", "Length or views", { max: 24 }),
                photo("cover", "Cover"),
            ],
            make: () => ({ url: "", title: "New video", cover: { file: "mic0.jpg" } }),
        }),
    ],
    make: () => ({
        type: "video" as const,
        variant: "card" as const,
        items: [
            {
                id: "a",
                url: "",
                title: "How I throw a tall vase",
                meta: "12 min",
                cover: { file: "potter3.jpg" },
            },
            {
                id: "b",
                url: "",
                title: "Mixing an ash glaze",
                meta: "9 min",
                cover: { file: "potter1.jpg" },
            },
            {
                id: "c",
                url: "",
                title: "A tour of the studio",
                meta: "6 min",
                cover: { file: "ceramic7.jpg" },
            },
        ],
    }),
    css: `${videoCss}
.b-vert{display:flex;gap:9px;overflow-x:auto;margin:10px -18px 0;padding:0 18px 4px;scrollbar-width:none}.b-vert>*{position:relative;flex:0 0 42%;aspect-ratio:9/16;border-radius:var(--r);overflow:hidden;color:#fff!important;background:#111}.b-vert>*::after{content:"";position:absolute;inset:50% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.78))}.b-vert i{position:absolute;right:8px;top:8px;z-index:1}.b-vert i .ic{width:20px;height:20px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))}.b-vert span{position:absolute;z-index:1;left:9px;right:9px;bottom:8px}.b-vert b{display:block;font-size:13.5px;line-height:1.2}.b-vert small{font-size:12px;opacity:.85}
.b-vrow{display:flex;gap:10px;overflow-x:auto;margin:10px -18px 0;padding:0 18px 4px;scrollbar-width:none}.b-vrow>*{flex:0 0 66%}.b-vposter{display:block;position:relative;height:150px;border-radius:var(--r);overflow:hidden;background:#111}.b-vposter i{position:absolute;right:8px;bottom:8px;color:#fff;filter:drop-shadow(0 1px 3px rgba(0,0,0,.7))}.b-vrow b{display:block;line-height:1.2;margin-top:6px;font-size:14.5px}.b-vrow small{font-size:13px;color:var(--mut)}`,
    render: (block, ctx) => {
        const first = block.items[0];
        if (!first) return "";
        const words = (index: number, title: string, meta: string | undefined) =>
            `${editableText(ctx, "b", `items.${String(index)}.title`, title)}${editableText(ctx, "small", `items.${String(index)}.meta`, meta)}`;
        if (block.variant === "card") {
            return linkOr(
                ctx,
                first.url,
                "b-video",
                `${photoTag(ctx, first.cover)}<span class="b-play">${icon("play")}</span><span class="b-vt">${words(0, first.title, first.meta)}</span>`,
            );
        }
        const cells = block.items.map((entry, i) => {
            const picture = photoTag(ctx, entry.cover);
            return block.variant === "vertical"
                ? linkOr(
                      ctx,
                      entry.url,
                      "",
                      `${picture}<i>${icon("play")}</i><span>${words(i, entry.title, entry.meta)}</span>`,
                  )
                : linkOr(
                      ctx,
                      entry.url,
                      "",
                      `<span class="b-vposter">${picture}<i>${icon("play")}</i></span>${words(i, entry.title, entry.meta)}`,
                  );
        });
        return `<div class="${block.variant === "vertical" ? "b-vert" : "b-vrow"}">${cells.join("")}</div>`;
    },
});
