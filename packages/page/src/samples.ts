import { blockDefinitions, blockTypes } from "./blocks";
import type { Block } from "./blocks";
import { PAGE_VERSION } from "./schema";
import type { Page } from "./schema";

// Fictional, used for seed data and previews.
export const sampleHandle = "sample";

export const samplePage: Page = {
    version: PAGE_VERSION,
    look: "madder",
    header: {
        layout: "look",
        name: "Maya Okafor",
        tagline: "Ceramicist in Vancouver",
        bio: "Stoneware for everyday use, thrown by hand in my East Van studio.",
        photo: { file: "woman23.jpg", x: 20, y: 22, zoom: 1.7 },
        links: [
            { id: "a", type: "instagram", value: "https://example.com/instagram" },
            { id: "b", type: "globe", value: "https://example.com" },
            { id: "c", type: "mail", value: "mailto:maya@example.com" },
        ],
    },
    blocks: [
        {
            id: "sale",
            type: "link-card",
            variant: "large",
            photo: { file: "ceramic0.jpg", y: 60 },
            title: "The autumn studio sale",
            text: "Seconds, test glazes and a few favourites, until November 22.",
            url: "https://example.com/shop",
        },
        { id: "work", type: "heading", variant: "plain", text: "New work" },
        {
            id: "vase",
            type: "link-card",
            variant: "small",
            photo: { file: "ceramic7.jpg" },
            title: "Tall ash vase",
            text: "$145 CAD",
            url: "https://example.com/vase",
        },
        {
            id: "mugs",
            type: "link-card",
            variant: "small",
            photo: { file: "potter0.jpg" },
            title: "Made to order mugs",
            text: "From $48 CAD",
            url: "https://example.com/mugs",
        },
        { id: "classes", type: "heading", variant: "plain", text: "Workshops" },
        {
            id: "wheel",
            type: "button",
            variant: "filled",
            text: "Wheel throwing for beginners",
            url: "https://example.com/wheel",
        },
        {
            id: "glaze",
            type: "button",
            variant: "outline",
            text: "Glazing with ash",
            url: "https://example.com/glaze",
        },
    ],
};

/** What a new person starts with. */
export function starterPage(name: string): Page {
    return {
        version: PAGE_VERSION,
        look: "madder",
        header: { layout: "look", name, links: [] },
        blocks: [],
    };
}

/** A page holding every layout of every block, for tests and the block gallery. */
export function everyLayoutPage(look: Page["look"] = "madder"): Page {
    const blocks = blockTypes
        .filter((type) => type !== "tabs")
        .flatMap((type) =>
            Object.keys(blockDefinitions[type].layouts).map(
                (variant) =>
                    ({
                        ...blockDefinitions[type].make(),
                        id: `${type}-${variant}`,
                        variant,
                    }) as Block,
            ),
        );
    const tabs: Block = {
        id: "tabs-pills",
        type: "tabs",
        variant: "pills",
        tabs: [
            { id: "one", label: "Shop", blocks: [] },
            { id: "two", label: "About", blocks: [] },
        ],
    };
    return { ...samplePage, look, blocks: [...blocks, tabs] };
}
