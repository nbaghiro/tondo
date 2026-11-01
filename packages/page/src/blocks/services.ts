import { z } from "zod";
import {
    blockSchema,
    defineBlock,
    editableText,
    escapeHtml,
    linkOr,
    linkValue,
    safeHref,
} from "../define-block";
import { link, list, longText, text, toggle } from "../fields";
import { item, lines, listItems } from "./parts";

const isTiers = (values: Readonly<Record<string, unknown>>) => values["variant"] === "tiers";

// Also a restaurant menu, and a set of plans.
export const services = defineBlock({
    schema: blockSchema("services", ["list", "menu", "tiers"], {
        items: z
            .array(
                item({
                    name: z.string().max(40),
                    detail: z.string().max(60).optional(),
                    price: z.string().max(24).optional(),
                    url: linkValue,
                    included: z.string().max(240).optional(),
                    popular: z.boolean().optional(),
                }),
            )
            .max(20),
        cta: z.string().max(14).optional(),
    }),
    name: "Services",
    group: "selling",
    layouts: {
        list: { label: "List" },
        menu: { label: "Menu" },
        tiers: { label: "Price tiers" },
    },
    fields: [
        list("items", "Services", {
            title: "name",
            add: "Add a service",
            max: 20,
            fields: [
                text("name", "Name", { max: 40 }),
                text("detail", "Length or description", { max: 60 }),
                text("price", "Price", { max: 24 }),
                link("url", "Book or enquire link"),
                longText("included", "What's included, one per line", {
                    max: 240,
                    when: isTiers,
                }),
                toggle("popular", "Mark as most popular", { when: isTiers }),
            ],
            make: () => ({ name: "New service", url: "" }),
        }),
        text("cta", "Button text", {
            max: 14,
            more: true,
            when: (values) => values["variant"] !== "menu",
        }),
    ],
    make: () => ({
        type: "services" as const,
        variant: "list" as const,
        cta: "Book",
        items: [
            {
                id: "a",
                name: "Wash and cut",
                detail: "25 min",
                price: "$37",
                url: "",
                included: "Wash included\nStyle advice",
            },
            {
                id: "b",
                name: "Fade and style",
                detail: "35 min",
                price: "$47",
                url: "",
                included: "Hot towel\nStyle advice",
                popular: true,
            },
            { id: "c", name: "Beard tidy", detail: "12 min", price: "$21", url: "" },
        ],
    }),
    css: `.b-svc{margin-top:10px;background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:2px 14px;box-shadow:var(--sh,none)}.b-svc>*{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--line)}.b-svc>:first-child{border:0}.b-svc b{display:block;line-height:1.25}.b-svc small{display:block;font-size:13px;opacity:.72}.b-svcr{display:flex;align-items:center;gap:10px;flex:none}.b-svc em{font-style:normal;font-weight:700}.b-svc .b-chip{padding:6px 11px}
.b-menu>div{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:baseline;padding:10px 0}.b-menu span{max-width:15.5em}.b-menu b{display:block;line-height:1.25}.b-menu small{display:block;font-size:13.5px;color:var(--mut);line-height:1.3;margin-top:2px}.b-menu i{border-bottom:1.5px dotted var(--mut);opacity:.6}.b-menu em{font-style:normal;font-weight:700}
.b-tiers{display:flex;gap:10px;overflow-x:auto;margin:12px -18px 0;padding:10px 18px 4px;scrollbar-width:none;scroll-snap-type:x proximity}.b-tiers>div{flex:0 0 74%;scroll-snap-align:center;position:relative;background:var(--card);color:var(--cardfg);border:var(--line-b,1px solid var(--line));border-radius:var(--r);padding:16px}.b-tiers .on{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}.b-tiers mark{position:absolute;top:-10px;left:14px;background:var(--acc);color:var(--ribfg,#fff);font-size:12px;font-weight:700;padding:3px 9px;border-radius:var(--rb)}.b-tiers b{display:block}.b-tiers strong{display:block;font:var(--dw,500) 30px/1.15 var(--disp);margin:4px 0 8px}.b-tiers strong small{font:500 13px var(--body);opacity:.72;margin-left:4px}.b-tiers ul{margin:0;padding-left:17px;font-size:14px}.b-tiers .b-btn{display:block}`,
    render: (block, ctx) => {
        if (!block.items.length) return "";
        const cta = escapeHtml(block.cta ?? "");
        const rows = block.items.map((entry, i) => {
            const at = `items.${String(i)}`;
            const name = editableText(ctx, "b", `${at}.name`, entry.name);
            const detail = editableText(ctx, "small", `${at}.detail`, entry.detail);
            const price = `<em>${editableText(ctx, "span", `${at}.price`, entry.price)}</em>`;
            const href = safeHref(entry.url);
            if (block.variant === "menu") {
                return `<div><span>${name}${detail}</span><i></i>${price}</div>`;
            }
            if (block.variant === "tiers") {
                return `<div class="${entry.popular ? "on" : ""}">${entry.popular ? "<mark>Most popular</mark>" : ""}${name}<strong>${escapeHtml(entry.price ?? "")}${entry.detail ? `<small>${escapeHtml(entry.detail)}</small>` : ""}</strong><ul>${listItems(lines(entry.included))}</ul>${cta && entry.url ? `<a class="b-btn b-sm" href="${href}">${cta}</a>` : ""}</div>`;
            }
            const chip = cta && entry.url ? `<span class="b-chip">${cta}</span>` : "";
            return linkOr(
                ctx,
                entry.url,
                "",
                `<span>${name}${detail}</span><span class="b-svcr">${price}${chip}</span>`,
            );
        });
        const cls = { list: "b-svc", menu: "b-menu", tiers: "b-tiers" }[block.variant];
        return `<div class="${cls}">${rows.join("")}</div>`;
    },
});
