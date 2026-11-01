import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    photoTag,
    photoValue,
} from "../define-block";
import { list, photo, text } from "../fields";
import { item } from "./parts";

export const logos = defineBlock({
    schema: blockSchema("logos", ["row"], {
        label: z.string().max(40).optional(),
        items: z.array(item({ name: z.string().max(24), logo: photoValue.optional() })).max(12),
    }),
    name: "Logos",
    group: "details",
    layouts: { row: { label: "Row" } },
    fields: [
        text("label", "Label", { max: 40, inline: true }),
        list("items", "Names", {
            title: "name",
            add: "Add a name",
            max: 12,
            hint: "A name works until you have a logo image.",
            fields: [text("name", "Name", { max: 24 }), photo("logo", "Logo image")],
            make: () => ({ name: "New name" }),
        }),
    ],
    make: () => ({
        type: "logos" as const,
        variant: "row" as const,
        label: "As seen in",
        items: [
            { id: "a", name: "Northern Review" },
            { id: "b", name: "The Morning Post" },
            { id: "c", name: "The Local" },
        ],
    }),
    css: `.b-logos{margin-top:22px;text-align:center}.b-logos small{color:var(--mut);font-size:13px}.b-logos div{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 20px;margin-top:8px;font-size:17px;font-weight:700;opacity:.86}.b-logos img{height:26px;width:auto}`,
    render: (block, ctx) => {
        if (!block.items.length) return "";
        const names = block.items.map(
            (entry) =>
                `<span>${entry.logo ? photoTag(ctx, entry.logo, entry.name) : escapeHtml(entry.name)}</span>`,
        );
        return `<div class="b-logos">${editableText(ctx, "small", "label", block.label)}<div>${names.join("")}</div></div>`;
    },
});
