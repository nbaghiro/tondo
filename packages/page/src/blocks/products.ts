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
import { carouselCss, item } from "./parts";

export const products = defineBlock({
    schema: blockSchema("products", ["grid", "carousel"], {
        items: z
            .array(
                item({
                    photo: photoValue.optional(),
                    name: z.string().max(50),
                    price: z.string().max(24).optional(),
                    url: linkValue,
                }),
            )
            .max(24),
    }),
    name: "Products",
    group: "selling",
    layouts: { grid: { label: "Grid" }, carousel: { label: "Carousel" } },
    fields: [
        list("items", "Products", {
            title: "name",
            add: "Add a product",
            max: 24,
            hint: "Tapping a product opens your link.",
            fields: [
                photo("photo", "Photo"),
                text("name", "Name", { max: 50 }),
                text("price", "Price", { max: 24, placeholder: "From $48 CAD" }),
                link("url", "Where to buy it"),
            ],
            make: () => ({ name: "New product", url: "", photo: { file: "ceramic0.jpg" } }),
        }),
    ],
    make: () => ({
        type: "products" as const,
        variant: "grid" as const,
        items: [
            {
                id: "a",
                name: "Tall ash vase",
                price: "$145 CAD",
                url: "",
                photo: { file: "ceramic7.jpg" },
            },
            {
                id: "b",
                name: "Made to order mugs",
                price: "From $48 CAD",
                url: "",
                photo: { file: "potter0.jpg" },
            },
        ],
    }),
    css: `.b-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.b-prod{display:block;background:var(--card);color:var(--cardfg)!important;padding:7px 7px 11px;border-radius:var(--r);border:var(--line-b,1px solid var(--line));box-shadow:var(--sh,none)}.b-pi{display:block;aspect-ratio:1;border-radius:calc(var(--r) - 6px);overflow:hidden;margin-bottom:8px}.b-prod b,.b-prod small{display:block;padding:0 4px;line-height:1.25}.b-prod small{font-size:13.5px;opacity:.76;margin-top:2px}
${carouselCss}.b-car b{display:block;font-weight:600;margin-top:7px;line-height:1.25}.b-car>a small{font-size:13.5px;font-weight:400;opacity:.8;margin-top:1px}`,
    render: (block, ctx) => {
        if (!block.items.length) return "";
        const carousel = block.variant === "carousel";
        const cells = block.items.map((entry, i) => {
            const at = `items.${String(i)}`;
            const words = `${editableText(ctx, "b", `${at}.name`, entry.name)}${editableText(ctx, "small", `${at}.price`, entry.price)}`;
            return carousel
                ? linkOr(ctx, entry.url, "", `${photoTag(ctx, entry.photo)}${words}`)
                : linkOr(
                      ctx,
                      entry.url,
                      "b-prod",
                      `<span class="b-pi">${photoTag(ctx, entry.photo)}</span>${words}`,
                  );
        });
        return `<div class="${carousel ? "b-car" : "b-grid"}">${cells.join("")}</div>`;
    },
});
