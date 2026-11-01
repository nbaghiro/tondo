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
import { link, photo, text } from "../fields";
import { icon } from "../icons";
import { readLink } from "../links";

const LARGE = new Set(["large", "over", "side"]);

export const linkCard = defineBlock({
    schema: blockSchema("link-card", ["small", "icon", "large", "over", "side"], {
        url: linkValue,
        title: z.string().max(70),
        text: z.string().max(160).optional(),
        photo: photoValue.optional(),
        cta: z.string().max(24).optional(),
        tag: z.string().max(18).optional(),
    }),
    name: "Link card",
    group: "actions",
    layouts: {
        small: { label: "Small photo" },
        icon: { label: "Icon" },
        large: { label: "Large photo" },
        over: { label: "Text over photo" },
        side: { label: "Side by side" },
    },
    fields: [
        link("url", "Link", { fills: "title" }),
        text("title", "Title", { max: 70, inline: true }),
        text("text", "Description", { max: 160, inline: true }),
        photo("photo", "Photo", { when: (values) => values["variant"] !== "icon" }),
        text("cta", "Button text", {
            max: 24,
            when: (values) => LARGE.has(String(values["variant"])),
        }),
        text("tag", "Small label", {
            max: 18,
            more: true,
            when: (values) => LARGE.has(String(values["variant"])),
        }),
    ],
    make: () => ({
        type: "link-card" as const,
        variant: "small" as const,
        url: "",
        title: "A link worth opening",
        text: "One line on why",
        photo: { file: "desk1.jpg" },
    }),
    css: `.b-thumb{display:grid;grid-template-columns:72px 1fr;gap:13px;align-items:center;background:var(--card);color:var(--cardfg)!important;border-radius:var(--r);border:var(--line-b,1px solid var(--line));padding:8px;margin-top:10px;box-shadow:var(--sh,none)}
.b-ti{display:block;width:72px;height:72px;border-radius:calc(var(--r) - 6px);overflow:hidden}.b-thumb b,.b-ft b{display:block;line-height:1.25}.b-thumb small,.b-ft small{display:block;font-size:13.5px;opacity:.76;margin-top:2px}
.b-thumb-plain{grid-template-columns:1fr;padding:12px 14px}.b-iconbox{display:grid;place-items:center;background:color-mix(in srgb,var(--acc) 14%,transparent);color:var(--cardfg)}
.b-feature{display:block;background:var(--card);color:var(--cardfg)!important;border-radius:var(--r);border:var(--line-b,1px solid var(--line));overflow:hidden;margin-top:10px;box-shadow:var(--sh,none)}.b-fi{display:block;height:190px;position:relative;overflow:hidden}.b-fi em{position:absolute;left:10px;top:10px;background:var(--btn);color:var(--btnfg);font:600 12.5px var(--body);padding:5px 10px;border-radius:var(--rb);z-index:1}.b-ft{display:block;padding:14px 15px 16px}.b-ft b{font:var(--dw,500) 19px/1.2 var(--disp)}
.b-f-over{position:relative;color:#fff!important;border:0}.b-f-over .b-fi{height:280px}.b-f-over .b-fi::after{content:"";position:absolute;inset:30% 0 0;background:linear-gradient(transparent,rgba(0,0,0,.78))}.b-f-over .b-ft{position:absolute;left:0;right:0;bottom:0;z-index:1}.b-f-over small{opacity:.92!important}
.b-f-side{display:grid;grid-template-columns:42% 1fr}.b-f-side .b-fi{height:100%;min-height:170px}.b-f-side .b-ft{padding:13px}.b-f-side .b-ft b{font-size:17px}`,
    render: (block, ctx) => {
        if (!block.title && !block.photo && !ctx.editable) return "";
        const words = `${editableText(ctx, "b", "title", block.title)}${editableText(ctx, "small", "text", block.text)}`;
        const href = safeHref(block.url);
        if (LARGE.has(block.variant)) {
            const tag = block.tag ? `<em>${escapeHtml(block.tag)}</em>` : "";
            const cta = block.cta
                ? `<span class="b-btn b-sm">${editableText(ctx, "span", "cta", block.cta)}</span>`
                : "";
            const layout = block.variant === "large" ? "" : ` b-f-${block.variant}`;
            return `<a class="b-feature${layout}" href="${href}"><span class="b-fi">${photoTag(ctx, block.photo)}${tag}</span><span class="b-ft">${words}${cta}</span></a>`;
        }
        if (block.variant === "icon") {
            const reading = readLink(block.url);
            const name = reading.state === "ok" ? reading.icon : "globe";
            return `<a class="b-thumb" href="${href}"><span class="b-ti b-iconbox">${icon(name)}</span><span>${words}</span></a>`;
        }
        const lead = block.photo ? `<span class="b-ti">${photoTag(ctx, block.photo)}</span>` : "";
        return `<a class="b-thumb${lead ? "" : " b-thumb-plain"}" href="${href}">${lead}<span>${words}</span></a>`;
    },
});
