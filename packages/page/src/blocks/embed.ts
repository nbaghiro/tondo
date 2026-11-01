import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    linkValue,
    photoTag,
    photoValue,
    safeHref,
} from "../define-block";
import { link, photo, text } from "../fields";
import { icon } from "../icons";
import { videoCss } from "./parts";

// Needs the per-page security policy. It stays out of the shelf until that exists.
export const embed = defineBlock({
    schema: blockSchema("embed", ["tap"], {
        url: linkValue,
        title: z.string().max(50),
        cover: photoValue.optional(),
    }),
    name: "Embed",
    group: "details",
    held: true,
    layouts: { tap: { label: "Tap to load" } },
    fields: [
        link("url", "Link to embed", {
            fills: "title",
            hint: "Paste a link from a service we support. Pasted scripts aren't allowed.",
        }),
        text("title", "Title", { max: 50, inline: true }),
        photo("cover", "Preview image"),
    ],
    make: () => ({
        type: "embed" as const,
        variant: "tap" as const,
        url: "",
        title: "Client intake form",
        cover: { file: "desk0.jpg" },
    }),
    css: videoCss,
    render: (block, ctx) =>
        `<a class="b-video" href="${safeHref(block.url)}">${photoTag(ctx, block.cover)}<span class="b-play">${icon("play")}</span><span class="b-vt">${editableText(ctx, "b", "title", block.title)}<small>Tap to load</small></span></a>`,
});
