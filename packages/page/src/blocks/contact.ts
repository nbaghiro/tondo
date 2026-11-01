import { z } from "zod";
import { blockSchema, defineBlock, escapeHtml, linkValue, safeHref } from "../define-block";
import { choice, link, list } from "../fields";
import { icon } from "../icons";
import { linkTypes } from "../links";
import { cardCss, item } from "./parts";

const LABELS: Record<(typeof linkTypes)[number], string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    spotify: "Spotify",
    apple: "Apple Music",
    globe: "Website",
    mail: "Email",
    phone: "Call",
    chat: "Message",
    pin: "Directions",
};

export const contact = defineBlock({
    schema: blockSchema("contact", ["icons", "buttons", "list"], {
        items: z.array(item({ type: z.enum(linkTypes), value: linkValue })).max(12),
    }),
    name: "Contact and social",
    group: "actions",
    layouts: {
        icons: { label: "Icons" },
        buttons: { label: "Buttons" },
        list: { label: "List" },
    },
    fields: [
        list("items", "Ways to reach you", {
            title: "type",
            add: "Add a way to reach you",
            max: 12,
            fields: [
                link("value", "Link, email or number", { sets: "type" }),
                choice("type", "Shown as", {
                    options: linkTypes.map((type) => [type, LABELS[type]] as const),
                }),
            ],
            make: () => ({ type: "globe", value: "" }),
        }),
    ],
    make: () => ({
        type: "contact" as const,
        variant: "buttons" as const,
        items: [
            { id: "a", type: "instagram" as const, value: "" },
            { id: "b", type: "mail" as const, value: "" },
            { id: "c", type: "phone" as const, value: "" },
        ],
    }),
    css: `.b-contact-b{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin-top:10px}.b-contact-b a{text-align:center;padding:11px 3px;font-size:13px;font-weight:600;${cardCss};color:var(--cardfg)!important}.b-contact-b .ic{margin:0 auto 3px}
.b-contact{margin-top:10px;${cardCss};padding:2px 14px}.b-contact a{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line)}.b-contact a:first-child{border:0}.b-contact b{display:block;line-height:1.2}.b-contact small{display:block;font-size:13px;opacity:.72;overflow-wrap:anywhere}.b-contact .ic{flex:none;color:var(--acc)}`,
    render: (block, ctx) => {
        const items = ctx.editable ? block.items : block.items.filter((entry) => entry.value);
        if (!items.length) return "";
        const rows = items.map((entry) => {
            const href = safeHref(entry.value);
            const label = LABELS[entry.type];
            if (block.variant === "icons") {
                return `<a href="${href}" aria-label="${label}">${icon(entry.type)}</a>`;
            }
            if (block.variant === "buttons") {
                return `<a href="${href}">${icon(entry.type)}<span>${label}</span></a>`;
            }
            const shown = entry.value.replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/, "");
            return `<a href="${href}">${icon(entry.type)}<span><b>${label}</b>${shown ? `<small>${escapeHtml(shown)}</small>` : ""}</span></a>`;
        });
        const cls = { icons: "b-social", buttons: "b-contact-b", list: "b-contact" }[block.variant];
        return `<div class="${cls}">${rows.join("")}</div>`;
    },
});
