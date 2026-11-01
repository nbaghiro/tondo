import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    escapeHtml,
    leavesOut,
    photoTag,
    photoValue,
} from "../define-block";
import { choice, photoList, source } from "../fields";

const STARTER = ["ceramic0", "potter1", "ceramic7", "potter3", "potter0", "book7"];

export const gallery = defineBlock({
    schema: blockSchema("gallery", ["grid", "mosaic", "carousel"], {
        source: z.enum(["manual", "instagram", "tiktok"]).optional(),
        photos: z
            .array(
                photoValue.extend({
                    id: z.string().min(1),
                    caption: z.string().max(60).optional(),
                }),
            )
            .max(24),
        count: z.enum(["3", "6", "9"]).optional(),
    }),
    name: "Gallery",
    group: "media",
    layouts: {
        grid: { label: "Grid" },
        mosaic: { label: "Mosaic" },
        carousel: { label: "Carousel" },
    },
    fields: [
        source("source", "Where it comes from", {
            options: [
                { value: "manual", label: "My photos" },
                { value: "instagram", label: "Instagram", held: true },
                { value: "tiktok", label: "TikTok covers", held: true },
            ],
        }),
        photoList("photos", "Photos", {
            max: 24,
            when: (values) => (values["source"] ?? "manual") === "manual",
        }),
        choice("count", "How many to show", {
            options: [
                ["3", "3"],
                ["6", "6"],
                ["9", "9"],
            ],
            when: (values) => (values["source"] ?? "manual") !== "manual",
        }),
    ],
    make: () => ({
        type: "gallery" as const,
        variant: "grid" as const,
        photos: STARTER.map((name) => ({ id: name, file: `${name}.jpg` })),
    }),
    css: `.b-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:10px}.b-gal>span{aspect-ratio:1;overflow:hidden;display:block;border-radius:calc(var(--r)/2)}
.b-mos{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:104px;gap:6px;margin-top:10px}.b-mos>span{display:block;overflow:hidden;border-radius:calc(var(--r)/2)}.b-mos>span:nth-child(6n+1){grid-column:span 2;grid-row:span 2}
.b-car{display:flex;gap:10px;overflow-x:auto;margin:10px -18px 0;padding:0 18px 4px;scrollbar-width:none;scroll-snap-type:x proximity}.b-car>span{flex:0 0 62%;display:block;scroll-snap-align:center}.b-car img{height:210px;border-radius:var(--r)}.b-car small{display:block;font-size:15px;font-weight:600;margin-top:7px}`,
    render: (block, ctx) => {
        const photos = block.photos.filter((p) => !leavesOut(ctx, p));
        if (!photos.length) return "";
        if (block.variant === "carousel") {
            const cells = photos.map(
                (p) =>
                    `<span>${photoTag(ctx, p)}${p.caption ? `<small>${escapeHtml(p.caption)}</small>` : ""}</span>`,
            );
            return `<div class="b-car">${cells.join("")}</div>`;
        }
        const cells = photos.map((p) => `<span>${photoTag(ctx, p)}</span>`);
        return `<div class="${block.variant === "mosaic" ? "b-mos" : "b-gal"}">${cells.join("")}</div>`;
    },
});
