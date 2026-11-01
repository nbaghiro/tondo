import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    linkValue,
    photoTag,
    photoValue,
    safeHref,
} from "../define-block";
import { link, list, photo, text } from "../fields";
import { icon } from "../icons";
import { item } from "./parts";

// A designed card that opens the link. It doesn't play anything itself.
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
        title: "Slow Weather",
        sub: "New album, 9 songs",
        cover: { file: "concert3.jpg" },
        tracks: [
            { id: "a", name: "Harbour Lights", length: "3:42" },
            { id: "b", name: "Slow Weather", length: "4:18" },
            { id: "c", name: "Call Me Back", length: "3:06" },
        ],
    }),
    css: `.b-player{display:block;background:var(--pl,var(--card));color:var(--plfg,var(--cardfg))!important;border-radius:var(--r);padding:12px;margin-top:10px;border:var(--line-b,1px solid var(--line));box-shadow:var(--sh,none)}.b-pt{display:grid;grid-template-columns:110px 1fr;gap:13px;align-items:center}.b-cover{display:block;height:110px;border-radius:calc(var(--r) - 6px);overflow:hidden}.b-pm b{display:block;font:var(--dw,500) 20px/1.15 var(--disp)}.b-pm small{display:block;opacity:.75;font-size:13.5px}.b-ctl{display:flex;align-items:center;gap:13px;margin-top:9px}.b-ctl i{display:grid;place-items:center;width:40px;height:40px;background:var(--plfg,var(--cardfg));color:var(--pl,var(--card));border-radius:50%}.b-ctl .ic{width:20px;height:20px}.b-player ol{margin:11px 0 0;padding:0 0 0 22px;font-size:14.5px}.b-player li{padding:6px 0;border-top:1px solid var(--line)}.b-player li span{display:inline-block;width:calc(100% - 44px)}.b-player li small{opacity:.7}
.b-player-c .b-pt{grid-template-columns:56px 1fr auto}.b-player-c .b-cover{height:56px}.b-player-c .b-pm b{font-size:16px}.b-mplay{display:grid;place-items:center;width:38px;height:38px;background:var(--plfg,var(--cardfg));color:var(--pl,var(--card));border-radius:50%}.b-mplay .ic{width:18px;height:18px}`,
    render: (block, ctx) => {
        if (!block.title && !ctx.editable) return "";
        const words = `${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "sub", block.sub)}`;
        const cover = `<span class="b-cover">${photoTag(ctx, block.cover)}</span>`;
        const href = safeHref(block.url);
        if (block.variant === "compact") {
            return `<a class="b-player b-player-c" href="${href}"><span class="b-pt">${cover}<span class="b-pm">${words}</span><i class="b-mplay">${icon("play")}</i></span></a>`;
        }
        const songs = (block.tracks ?? []).map(
            (song) =>
                `<li><span>${escapeHtml(song.name)}</span><small>${escapeHtml(song.length ?? "")}</small></li>`,
        );
        return `<a class="b-player" href="${href}"><span class="b-pt">${cover}<span class="b-pm">${words}<span class="b-ctl">${icon("prev")}<i>${icon("play")}</i>${icon("next")}</span></span></span>${songs.length ? `<ol>${songs.join("")}</ol>` : ""}</a>`;
    },
});
