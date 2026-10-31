import { choice, link, list, longText, photo, text } from "./fields";
import type { Field } from "./fields";
import type { headerLayouts } from "./schema";

export const headerLayoutLabels: Record<(typeof headerLayouts)[number], string> = {
    look: "This look's own",
    centred: "Centred",
    left: "Left",
    full: "Full photo",
    arch: "Arch",
    banner: "Banner",
};

const LINK_TYPES = [
    ["instagram", "Instagram"],
    ["tiktok", "TikTok"],
    ["youtube", "YouTube"],
    ["spotify", "Spotify"],
    ["apple", "Apple Music"],
    ["globe", "Website"],
    ["mail", "Email"],
    ["phone", "Phone"],
    ["chat", "Messages"],
    ["pin", "Location"],
] as const;

export const headerFields: readonly Field[] = [
    text("name", "Name", { max: 80, inline: true }),
    text("tagline", "Short line", { max: 120, inline: true }),
    photo("photo", "Photo"),
    longText("bio", "About", { max: 280, inline: true }),
    list("links", "Links", {
        title: "type",
        add: "Add a link",
        max: 12,
        make: () => ({ type: "globe", value: "" }),
        fields: [
            link("value", "Address", { sets: "type" }),
            choice("type", "Shows as", { options: LINK_TYPES }),
        ],
    }),
    text("buttonText", "Main button", { max: 40, more: true }),
    link("buttonUrl", "Where it goes", { more: true }),
];
