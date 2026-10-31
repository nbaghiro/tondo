import type { Page } from "./schema";

// Fictional, used for seed data and previews.
export const sampleHandle = "sample";

export const samplePage: Page = {
    look: "madder",
    header: {
        name: "Maya Okafor",
        tagline: "Ceramicist in Vancouver",
        bio: "Stoneware for everyday use, thrown by hand in my East Van studio.",
        photo: "woman23",
        position: "50% 22%",
        zoom: 1.8,
        social: [
            { network: "instagram", url: "https://example.com/instagram" },
            { network: "globe", url: "https://example.com" },
            { network: "mail", url: "mailto:maya@example.com" },
        ],
    },
    blocks: [
        {
            id: "sale",
            type: "link-card",
            variant: "large",
            photo: "ceramic0",
            position: "50% 60%",
            title: "The autumn studio sale",
            text: "Seconds, test glazes and a few favourites, until November 22.",
            url: "https://example.com/shop",
        },
        { id: "work", type: "heading", variant: "plain", text: "New work" },
        {
            id: "vase",
            type: "link-card",
            variant: "small",
            photo: "ceramic7",
            title: "Tall ash vase",
            text: "$145 CAD",
            url: "https://example.com/vase",
        },
        {
            id: "mugs",
            type: "link-card",
            variant: "small",
            photo: "potter0",
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
        look: "madder",
        header: { name, tagline: "", bio: "", photo: "", social: [] },
        blocks: [],
    };
}
