import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    linkValue,
    photoTag,
    photoValue,
    linkOr,
} from "../define-block";
import { link, list, photo, text } from "../fields";
import { readLink } from "../links";
import { item } from "./parts";

// A designed card that opens the link. It doesn't play anything itself.
const openLabel = (url: string): string => {
    const reading = readLink(url);
    return reading.state === "ok" && reading.service ? `Open in ${reading.service}` : "Listen";
};

export const music = defineBlock({
    schema: blockSchema("music", ["compact", "full"], {
        url: linkValue,
        title: z.string().max(50),
        sub: z.string().max(50).optional(),
        cover: photoValue.optional(),
        tracks: z
            .array(item({ name: z.string().max(50), length: z.string().max(6).optional() }))
            .max(12)
            .optional(),
    }),
    name: "Music",
    group: "media",
    layouts: { compact: { label: "Compact" }, full: { label: "Full" } },
    fields: [
        link("url", "Album, song or playlist link", { fills: "title" }),
        text("title", "Title", { max: 50, inline: true }),
        text("sub", "Short line", { max: 50, inline: true }),
        photo("cover", "Cover"),
        list("tracks", "Songs", {
            title: "name",
            add: "Add a song",
            max: 12,
            more: true,
            when: (values) => values["variant"] === "full",
            fields: [text("name", "Song", { max: 50 }), text("length", "Length", { max: 6 })],
            make: () => ({ name: "New song" }),
        }),
    ],
    make: () => ({
        type: "music" as const,
        variant: "full" as const,
        url: "",
        title: "Long Evenings",
        sub: "New album, 8 songs",
        cover: { file: "concert3.jpg" },
        tracks: [
            { id: "a", name: "Night Bus", length: "3:51" },
            { id: "b", name: "Long Evenings", length: "4:02" },
            { id: "c", name: "Ring Me Later", length: "3:15" },
        ],
    }),
    css: `.b-player{display:block;background:var(--pl,var(--card));color:var(--plfg,var(--cardfg))!important;border-radius:var(--r);padding:12px;margin-top:10px;border:var(--line-b,1px solid var(--line));box-shadow:var(--sh,none)}.b-pt{display:grid;grid-template-columns:110px 1fr;gap:13px;align-items:center}.b-cover{display:block;height:110px;border-radius:calc(var(--r) - 6px);overflow:hidden}.b-pm b{display:block;font:var(--dw,500) 20px/1.15 var(--disp)}.b-pm small{display:block;opacity:.75;font-size:13.5px}.b-mopen{display:inline-block;margin-top:9px;padding:8px 14px;font:600 13.5px/1.2 var(--body);background:var(--plfg,var(--cardfg));color:var(--pl,var(--card));border-radius:var(--rb)}.b-player ul{list-style:none;margin:11px 0 0;padding:0;font-size:14.5px}.b-player li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid var(--line)}.b-player li small{opacity:.7}
.b-player-c .b-pt{grid-template-columns:56px 1fr auto}.b-player-c .b-cover{height:56px}.b-player-c .b-pm b{font-size:16px}.b-player-c .b-mopen{margin:0}`,
    render: (block, ctx) => {
        if (!block.title && !ctx.editable) return "";
        const words = `${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}`;
        const cover = `<span class="b-cover">${photoTag(ctx, block.cover)}</span>`;
        const open =
            block.url || ctx.editable ? `<span class="b-mopen">${openLabel(block.url)}</span>` : "";
        if (block.variant === "compact") {
            return linkOr(
                ctx,
                block.url,
                "b-player b-player-c",
                `<span class="b-pt">${cover}<span class="b-pm">${words}</span>${open}</span>`,
            );
        }
        const songs = (block.tracks ?? []).map(
            (song) =>
                `<li><span>${escapeHtml(song.name)}</span><small>${escapeHtml(song.length ?? "")}</small></li>`,
        );
        return linkOr(
            ctx,
            block.url,
            "b-player",
            `<span class="b-pt">${cover}<span class="b-pm">${words}${open}</span></span>${songs.length ? `<ul>${songs.join("")}</ul>` : ""}`,
        );
    },
});
