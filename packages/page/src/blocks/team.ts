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
import { link, list, photo, text } from "../fields";
import { item } from "./parts";

export const team = defineBlock({
    schema: blockSchema("team", ["circles", "list"], {
        items: z
            .array(
                item({
                    photo: photoValue.optional(),
                    name: z.string().max(30),
                    role: z.string().max(40).optional(),
                    url: linkValue.optional(),
                }),
            )
            .max(12),
    }),
    name: "Team",
    group: "details",
    layouts: { circles: { label: "Circles" }, list: { label: "List" } },
    fields: [
        list("items", "People", {
            title: "name",
            add: "Add a person",
            max: 12,
            fields: [
                photo("photo", "Photo"),
                text("name", "Name", { max: 30 }),
                text("role", "Role", { max: 40 }),
                link("url", "Link to their page"),
            ],
            make: () => ({ name: "New person" }),
        }),
    ],
    make: () => ({
        type: "team" as const,
        variant: "circles" as const,
        items: [
            {
                id: "a",
                name: "Joan Avery",
                role: "Owner",
                photo: { file: "woman24.jpg", x: 54, y: 30 },
            },
            {
                id: "b",
                name: "Ren Cole",
                role: "Events",
                photo: { file: "woman25.jpg", x: 85, y: 30 },
            },
            {
                id: "c",
                name: "Ana Diaz",
                role: "Front desk",
                photo: { file: "woman22.jpg", y: 35 },
            },
        ],
    }),
    css: `.b-team{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px;text-align:center}.b-team span{display:block;aspect-ratio:1;border-radius:50%;overflow:hidden;margin-bottom:7px;background:var(--line)}.b-team b{display:block;font-size:14.5px;line-height:1.2}.b-team small{font-size:12.5px;color:var(--mut)}
.b-people>*{display:grid;grid-template-columns:76px 1fr auto;gap:13px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.b-people>*>span:first-child{display:block;width:76px;height:92px;overflow:hidden;border-radius:calc(var(--r)/2);background:var(--line)}.b-people b{display:block;font:var(--dw,500) 19px/1.15 var(--disp)}.b-people small{display:block;font-size:13.5px;color:var(--mut)}.b-people i{font-style:normal;font-size:13px;font-weight:600;white-space:nowrap}`,
    render: (block, ctx) => {
        if (!block.items.length) return "";
        const list = block.variant === "list";
        const people = block.items.map((entry, i) => {
            const at = `items.${String(i)}`;
            const words = `${editableText(ctx, "b", `${at}.name`, entry.name)}${editableText(ctx, "small", `${at}.role`, entry.role)}`;
            const picture = `<span>${photoTag(ctx, entry.photo)}</span>`;
            return list
                ? linkOr(
                      ctx,
                      entry.url,
                      "",
                      `${picture}<span>${words}</span>${entry.url ? "<i>See page</i>" : ""}`,
                  )
                : linkOr(ctx, entry.url, "", `${picture}${words}`);
        });
        return `<div class="${list ? "b-people" : "b-team"}">${people.join("")}</div>`;
    },
});
