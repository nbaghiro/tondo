import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    linkValue,
    leavesOut,
    photoTag,
    photoValue,
    safeHref,
} from "../define-block";
import { link, photo, text } from "../fields";

export const image = defineBlock({
    schema: blockSchema("image", ["full", "framed", "round", "arch"], {
        photo: photoValue.optional(),
        caption: z.string().max(80).optional(),
        alt: z.string().max(140).optional(),
        url: linkValue.optional(),
    }),
    name: "Photo",
    group: "media",
    layouts: {
        full: { label: "Full width" },
        framed: { label: "Framed" },
        round: { label: "Round" },
        arch: { label: "Arch" },
    },
    fields: [
        photo("photo", "Photo"),
        text("caption", "Caption", { max: 80, inline: true }),
        text("alt", "Description for screen readers", { max: 140, more: true }),
        link("url", "Link when tapped", { more: true }),
    ],
    make: () => ({
        type: "image" as const,
        variant: "framed" as const,
        photo: { file: "potter3.jpg" },
    }),
    css: `.b-img{margin:12px 0 0}.b-img>span,.b-img>a{display:block;overflow:hidden}.b-img figcaption{font-size:13.5px;color:var(--mut);margin-top:6px;text-align:center}.b-img-full{margin-inline:-18px}.b-img-full>*:first-child{height:300px}.b-img-framed>*:first-child{height:280px;border:var(--line-b,1px solid var(--line));padding:8px;background:var(--card);border-radius:var(--r)}.b-img-framed img{border-radius:calc(var(--r)/1.5)}.b-img-round>*:first-child{width:230px;height:230px;margin:auto;border-radius:50%}.b-img-arch>*:first-child{width:78%;height:320px;margin:auto;border-radius:200px 200px 14px 14px}`,
    render: (block, ctx) => {
        if (!block.photo || leavesOut(ctx, block.photo)) return "";
        const picture = photoTag(ctx, block.photo, block.alt);
        const frame = block.url
            ? `<a href="${safeHref(block.url)}">${picture}</a>`
            : `<span>${picture}</span>`;
        return `<figure class="b-img b-img-${block.variant}">${frame}${editableText(ctx, "figcaption", "caption", block.caption)}</figure>`;
    },
});
