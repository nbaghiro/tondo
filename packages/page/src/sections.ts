import { blockDefinitions, blockSchemaUnion } from "./blocks";
import type { Block, BlockType } from "./blocks";
import { blockProblem, hasPlaceholder } from "./publish";
import type { MakeId, Place } from "./operations";
import type { Page } from "./schema";

// People see sections. Underneath, a section is one or more blocks next to each other that share a
// section id. Which section it is gets worked out from its blocks, so that isn't saved.

export interface SectionStyle {
    id: string;
    label: string;
    /** Which small drawing shows this style. */
    wire: string;
    type: BlockType;
    variant: string;
    /** The rarer layouts of this style, offered under More options. */
    options?: { label: string; choices: readonly (readonly [string, string])[] };
}

export interface SectionDefinition {
    key: string;
    name: string;
    why: string;
    icon: string;
    /** Found by searching for these as well as the name. */
    words: string;
    /** Only offered under "Less common". */
    less?: boolean;
    title?: string;
    styles: readonly [SectionStyle, ...SectionStyle[]];
    /** What a new section of this style starts with, without ids. */
    sample: (style: SectionStyle) => BlockSeed[];
}

type BlockSeed = Record<string, unknown> & { type: BlockType; variant: string };

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 16);
const painted = (n: number) => ({ file: `paint-${String(n)}` });
const own = (style: SectionStyle): BlockSeed => ({
    ...blockDefinitions[style.type].make(),
    type: style.type,
    variant: style.variant,
});
const like = (style: SectionStyle, data: Record<string, unknown>): BlockSeed => ({
    type: style.type,
    variant: style.variant,
    ...data,
});
const items = <T>(list: readonly T[], make: (entry: T, i: number) => Record<string, unknown>) =>
    list.map((entry, i) => ({ id: String(i), ...make(entry, i) }));

const LINKS = [
    ["My website", "Everything in one place"],
    ["See my latest work", "Fresh this month"],
    ["Get in touch", "I reply within a day"],
] as const;

function linkSeed(style: SectionStyle, text: string, sub: string, url: string, n: number) {
    if (style.type === "button") return like(style, { text, url });
    return like(style, {
        title: text,
        text: sub,
        url,
        ...(style.variant === "small" ? { photo: painted(n) } : {}),
    });
}

export const sectionDefinitions: readonly SectionDefinition[] = [
    {
        key: "links",
        name: "Links",
        why: "The places you most want people to go",
        icon: "link",
        words: "buttons website shop portfolio linktree",
        styles: [
            { id: "buttons", label: "Buttons", wire: "rows", type: "button", variant: "filled" },
            {
                id: "outline",
                label: "Outlined",
                wire: "outline",
                type: "button",
                variant: "outline",
            },
            {
                id: "cards",
                label: "With photos",
                wire: "cards",
                type: "link-card",
                variant: "small",
            },
            { id: "icons", label: "With icons", wire: "icons", type: "link-card", variant: "icon" },
        ],
        sample: (style) => LINKS.map(([text, sub], i) => linkSeed(style, text, sub, "", i + 1)),
    },
    {
        key: "spotlight",
        name: "Spotlight",
        why: "The one thing you most want seen",
        icon: "star",
        words: "feature hero highlight big sale launch",
        styles: [
            {
                id: "large",
                label: "Photo on top",
                wire: "top",
                type: "link-card",
                variant: "large",
            },
            {
                id: "over",
                label: "Words on photo",
                wire: "over",
                type: "link-card",
                variant: "over",
            },
            { id: "side", label: "Side by side", wire: "side", type: "link-card", variant: "side" },
        ],
        sample: (style) => [
            like(style, {
                photo: painted(2),
                title: "Something worth seeing",
                text: "Tell people why it matters, in one line.",
                cta: "Take a look",
                url: "",
                tag: "New",
            }),
        ],
    },
    {
        key: "banner",
        name: "Moving banner",
        why: "A line of words that catches the eye",
        icon: "wave",
        words: "ribbon announcement marquee ticker scrolling",
        styles: [
            { id: "wave", label: "Wave", wire: "wave", type: "ribbon", variant: "wave" },
            { id: "moving", label: "Straight", wire: "ribbon", type: "ribbon", variant: "moving" },
            { id: "still", label: "Still", wire: "still", type: "ribbon", variant: "still" },
        ],
        sample: (style) => [like(style, { text: "Something new is coming" })],
    },
    {
        key: "photos",
        name: "Photos",
        why: "Show your work, or your week",
        icon: "photo",
        words: "gallery images pictures grid carousel instagram",
        styles: [
            { id: "grid", label: "Grid", wire: "grid", type: "gallery", variant: "grid" },
            { id: "mosaic", label: "Mosaic", wire: "mosaic", type: "gallery", variant: "mosaic" },
            { id: "carousel", label: "Swipe", wire: "swipe", type: "gallery", variant: "carousel" },
            {
                id: "one",
                label: "One big",
                wire: "top",
                type: "image",
                variant: "framed",
                options: {
                    label: "Shape",
                    choices: [
                        ["framed", "Framed"],
                        ["full", "Full width"],
                        ["round", "Round"],
                        ["arch", "Arch"],
                    ],
                },
            },
        ],
        sample: (style) =>
            style.type === "image"
                ? [like(style, { photo: painted(1) })]
                : [
                      like(style, {
                          source: "manual",
                          photos: [1, 2, 3, 4, 5, 6].map((n) => ({
                              id: String(n),
                              ...painted(n),
                          })),
                      }),
                  ],
    },
    {
        key: "about",
        name: "About me",
        why: "A few words so people know who you are",
        icon: "hand",
        words: "bio text story intro paragraph",
        title: "A little about me",
        styles: [
            { id: "plain", label: "Plain", wire: "text", type: "text", variant: "plain" },
            { id: "card", label: "On a card", wire: "card", type: "text", variant: "card" },
        ],
        sample: (style) => [
            like(style, {
                text: "Say what you do, who it's for and why you enjoy it. Two or three lines is plenty.",
            }),
        ],
    },
    {
        key: "shop",
        name: "Shop",
        why: "Things people can buy from you",
        icon: "bag",
        words: "products store sell etsy shopify merch",
        title: "Shop",
        styles: [
            { id: "grid", label: "Grid", wire: "grid2", type: "products", variant: "grid" },
            {
                id: "carousel",
                label: "Swipe",
                wire: "swipe",
                type: "products",
                variant: "carousel",
            },
        ],
        sample: (style) => [
            like(style, {
                items: items(
                    [
                        ["First thing", "$24"],
                        ["Second thing", "$36"],
                    ],
                    ([name, price], i) => ({ name, price, url: "", photo: painted(i + 3) }),
                ),
            }),
        ],
    },
    {
        key: "services",
        name: "Services and prices",
        why: "What you offer and what it costs",
        icon: "tag",
        words: "menu pricing tiers plans restaurant packages",
        title: "What I offer",
        styles: [
            { id: "list", label: "List", wire: "rows", type: "services", variant: "list" },
            { id: "menu", label: "Menu", wire: "menu", type: "services", variant: "menu" },
            {
                id: "tiers",
                label: "Price plans",
                wire: "tiers",
                type: "services",
                variant: "tiers",
            },
        ],
        sample: (style) => [
            like(style, {
                cta: "Book",
                items: items(
                    [
                        ["First service", "30 minutes", "$40"],
                        ["Second service", "1 hour", "$75"],
                        ["Third service", "Half a day", "$180"],
                    ],
                    ([name, detail, price], i) => ({
                        name,
                        detail,
                        price,
                        url: "",
                        included: "Something included\nAnother good thing",
                        ...(i === 1 ? { popular: true } : {}),
                    }),
                ),
            }),
        ],
    },
    {
        key: "bookings",
        name: "Bookings",
        why: "Let people book a time with you",
        icon: "cal",
        words: "calendly cal.com appointment schedule meeting",
        styles: [
            { id: "card", label: "Book button", wire: "card", type: "booking", variant: "card" },
            {
                id: "calendar",
                label: "Calendar",
                wire: "cal",
                type: "booking",
                variant: "calendar",
            },
            { id: "slots", label: "Time slots", wire: "grid", type: "booking", variant: "slots" },
        ],
        sample: (style) => [
            {
                ...own(style),
                url: "",
                title: "Book a time with me",
                sub: "It takes less than a minute",
                cta: "Pick a time",
            },
        ],
    },
    {
        key: "events",
        name: "Events",
        why: "Dates people shouldn't miss",
        icon: "pin",
        words: "tour tickets gigs classes schedule countdown launch",
        title: "Coming up",
        styles: [
            { id: "list", label: "List", wire: "rows", type: "events", variant: "list" },
            { id: "next", label: "Next one", wire: "card", type: "events", variant: "next" },
            {
                id: "schedule",
                label: "Schedule",
                wire: "menu",
                type: "events",
                variant: "schedule",
            },
            {
                id: "countdown",
                label: "Countdown",
                wire: "count",
                type: "countdown",
                variant: "large",
                options: {
                    label: "Size",
                    choices: [
                        ["large", "Large"],
                        ["inline", "Slim bar"],
                    ],
                },
            },
        ],
        sample: (style) =>
            style.type === "countdown"
                ? [{ ...own(style), label: "Starting in", at: days(21) }]
                : [
                      like(style, {
                          cta: "Tickets",
                          items: items(
                              [
                                  ["First event", "Where it's happening", 14],
                                  ["Second event", "Another place", 28],
                              ] as const,
                              ([name, place, n]) => ({
                                  name,
                                  place,
                                  label: "7:00 pm",
                                  at: days(n),
                                  url: "",
                              }),
                          ),
                      }),
                  ],
    },
    {
        key: "media",
        name: "Watch and listen",
        why: "A video or song to play",
        icon: "play",
        words: "youtube tiktok vimeo spotify apple music soundcloud podcast reels",
        styles: [
            { id: "card", label: "Video", wire: "top", type: "video", variant: "card" },
            {
                id: "vertical",
                label: "Short videos",
                wire: "swipe",
                type: "video",
                variant: "vertical",
            },
            { id: "row", label: "Latest videos", wire: "rows", type: "video", variant: "row" },
            {
                id: "music",
                label: "Music",
                wire: "music",
                type: "music",
                variant: "full",
                options: {
                    label: "Size",
                    choices: [
                        ["full", "With songs"],
                        ["compact", "Compact"],
                    ],
                },
            },
        ],
        sample: (style) =>
            style.type === "music"
                ? [
                      {
                          ...own(style),
                          url: "",
                          title: "My latest release",
                          sub: "Have a listen",
                          cover: painted(5),
                      },
                  ]
                : [
                      like(style, {
                          source: "manual",
                          items: items(
                              [
                                  ["Watch this first", "4 min"],
                                  ["Behind the scenes", "6 min"],
                                  ["How it's made", "9 min"],
                              ],
                              ([title, meta], i) => ({
                                  title,
                                  meta,
                                  url: "",
                                  cover: painted(i + 1),
                              }),
                          ),
                      }),
                  ],
    },
    {
        key: "proof",
        name: "Kind words",
        why: "What people say, and what you've done",
        icon: "quote",
        words: "testimonials reviews quotes numbers stats logos press clients",
        styles: [
            {
                id: "quote",
                label: "Quote",
                wire: "quote",
                type: "quotes",
                variant: "large",
                options: {
                    label: "Shown as",
                    choices: [
                        ["large", "Large"],
                        ["card", "On a card"],
                    ],
                },
            },
            {
                id: "carousel",
                label: "Swipe quotes",
                wire: "swipe",
                type: "quotes",
                variant: "carousel",
            },
            { id: "stats", label: "Numbers", wire: "stats", type: "stats", variant: "row" },
            { id: "logos", label: "Logos", wire: "logos", type: "logos", variant: "row" },
        ],
        sample: (style) => {
            if (style.type === "quotes") {
                return [
                    like(style, {
                        items: items(
                            [
                                ["This was exactly what I needed.", "A happy client"],
                                ["Quick, friendly and on time.", "Another happy client"],
                            ],
                            ([text, by]) => ({ text, by }),
                        ),
                    }),
                ];
            }
            return [own(style)];
        },
    },
    {
        key: "questions",
        name: "Questions",
        why: "Answer what people always ask",
        icon: "ask",
        words: "faq answers accordion",
        title: "Good to know",
        styles: [
            { id: "faq", label: "Questions", wire: "rows", type: "faq", variant: "accordion" },
        ],
        sample: (style) => [
            like(style, {
                items: items(
                    [
                        ["How does it work?", "Explain it in a sentence or two."],
                        ["How long does it take?", "Say what people can expect."],
                    ],
                    ([question, answer]) => ({ question, answer }),
                ),
            }),
        ],
    },
    {
        key: "find",
        name: "Socials and contact",
        why: "Your social icons, how to reach you and where you are",
        icon: "mail",
        words: "contact email phone whatsapp social socials icons instagram tiktok youtube address map hours directions location",
        styles: [
            {
                id: "buttons",
                label: "Buttons",
                wire: "rows",
                type: "contact",
                variant: "buttons",
                options: {
                    label: "Shown as",
                    choices: [
                        ["buttons", "Buttons"],
                        ["list", "A list"],
                    ],
                },
            },
            { id: "icons", label: "Icons", wire: "icons2", type: "contact", variant: "icons" },
            {
                id: "place",
                label: "Address and hours",
                wire: "map",
                type: "location",
                variant: "both",
                options: {
                    label: "Show",
                    choices: [
                        ["both", "Map and hours"],
                        ["map", "Map only"],
                        ["hours", "Hours only"],
                    ],
                },
            },
        ],
        sample: (style) =>
            style.type === "contact"
                ? [
                      like(style, {
                          items: items(["instagram", "mail", "phone"], (type) => ({
                              type,
                              value: "",
                          })),
                      }),
                  ]
                : [
                      like(style, {
                          address: "42 Water Street",
                          note: "Open today until 5 pm",
                          hours: items(
                              [
                                  ["Mon to Fri", "9 am to 5 pm"],
                                  ["Sat", "10 am to 2 pm"],
                              ],
                              ([d, time]) => ({ days: d, time }),
                          ),
                      }),
                  ],
    },
    {
        key: "touch",
        name: "Stay in touch",
        why: "Collect emails or messages",
        icon: "send",
        words: "newsletter signup subscribe form enquiry contact form mailing list",
        styles: [
            { id: "card", label: "Email sign-up", wire: "card", type: "signup", variant: "card" },
            { id: "plain", label: "Simple line", wire: "line", type: "signup", variant: "plain" },
            { id: "form", label: "Message form", wire: "form", type: "form", variant: "card" },
        ],
        sample: (style) => [own(style)],
    },
    {
        key: "team",
        name: "Team",
        why: "The people behind it",
        icon: "people",
        words: "staff members who",
        less: true,
        title: "Who you'll work with",
        styles: [
            { id: "circles", label: "Circles", wire: "stats", type: "team", variant: "circles" },
            { id: "list", label: "List", wire: "rows", type: "team", variant: "list" },
        ],
        sample: (style) => [
            like(style, {
                items: items(
                    [
                        ["Your name", "Founder"],
                        ["Teammate", "Helps out"],
                        ["Teammate", "Helps out"],
                    ],
                    ([name, role], i) => ({ name, role, url: "", photo: painted(i + 1) }),
                ),
            }),
        ],
    },
    {
        key: "story",
        name: "My story",
        why: "Work history or milestones, in order",
        icon: "line",
        words: "timeline resume cv experience history",
        less: true,
        title: "My story",
        styles: [
            { id: "line", label: "Timeline", wire: "rows", type: "timeline", variant: "line" },
        ],
        sample: (style) => [own(style)],
    },
    {
        key: "posts",
        name: "Latest posts",
        why: "Your blog, newsletter or podcast",
        icon: "doc",
        words: "blog rss articles podcast writing",
        less: true,
        title: "Latest posts",
        styles: [
            { id: "list", label: "List", wire: "rows", type: "posts", variant: "list" },
            { id: "cards", label: "Cards", wire: "cards", type: "posts", variant: "cards" },
        ],
        sample: (style) => [own(style)],
    },
    {
        key: "download",
        name: "Download",
        why: "A file people can take away",
        icon: "down",
        words: "pdf file guide media kit resume",
        less: true,
        styles: [{ id: "file", label: "File", wire: "card", type: "file", variant: "card" }],
        sample: (style) => [own(style)],
    },
    {
        key: "tip",
        name: "Tip jar",
        why: "Let people say thanks with a few dollars",
        icon: "heart",
        words: "donate support coffee payment",
        less: true,
        styles: [
            { id: "amounts", label: "Amounts", wire: "grid", type: "tip", variant: "amounts" },
            { id: "single", label: "One button", wire: "card", type: "tip", variant: "single" },
        ],
        sample: (style) => [own(style)],
    },
    {
        key: "embed",
        name: "Embed",
        why: "Something from another service",
        icon: "code",
        words: "embed typeform iframe",
        less: true,
        styles: [{ id: "embed", label: "Embed", wire: "top", type: "embed", variant: "tap" }],
        sample: (style) => [own(style)],
    },
    {
        key: "tabs",
        name: "Tabs",
        why: "Split a long page into a few parts",
        icon: "tabs",
        words: "pages sections",
        less: true,
        styles: [{ id: "pills", label: "Tabs", wire: "rows", type: "tabs", variant: "pills" }],
        sample: (style) => [
            like(style, {
                tabs: [
                    { id: "one", label: "Shop", blocks: [] },
                    { id: "two", label: "About", blocks: [] },
                ],
            }),
        ],
    },
    {
        key: "space",
        name: "A little space",
        why: "A line or some breathing room",
        icon: "gap",
        words: "divider separator line space",
        less: true,
        styles: [
            { id: "line", label: "Line", wire: "line", type: "divider", variant: "line" },
            { id: "space", label: "Space", wire: "still", type: "divider", variant: "space" },
            { id: "paint", label: "Painting", wire: "top", type: "divider", variant: "paint" },
        ],
        sample: (style) => [own(style)],
    },
];

/** A heading on its own, which older pages can have. It isn't offered as a new section. */
const TITLE: SectionDefinition = {
    key: "title",
    name: "Title",
    why: "A heading for what's below it",
    icon: "doc",
    words: "",
    less: true,
    styles: [{ id: "plain", label: "Title", wire: "text", type: "heading", variant: "plain" }],
    sample: (style) => [own(style)],
};

export const sectionDefinition = (key: string): SectionDefinition | undefined =>
    sectionDefinitions.find((definition) => definition.key === key);

const heldStyle = (style: SectionStyle): boolean =>
    blockDefinitions[style.type].held ||
    Boolean(blockDefinitions[style.type].layouts[style.variant]?.held);

/** Whether a style works yet. One that doesn't stays visible but can't be picked. */
export const styleAvailable = (style: SectionStyle): boolean => !heldStyle(style);

/** Whether any style of a section works yet. If not, it can't be added. */
export const sectionAvailable = (definition: SectionDefinition): boolean =>
    definition.styles.some(styleAvailable);

export interface Section {
    id: string;
    definition: SectionDefinition;
    style: SectionStyle;
    /** The heading above it, if it has one. */
    title?: Extract<Block, { type: "heading" }>;
    /** Everything else, in order. */
    blocks: Block[];
    /** Every block, title included. */
    all: Block[];
}

function matchStyle(block: Block): [SectionDefinition, SectionStyle] {
    for (const definition of sectionDefinitions) {
        for (const style of definition.styles) {
            if (style.type !== block.type) continue;
            const inOptions = style.options?.choices.some(([variant]) => variant === block.variant);
            if (style.variant === block.variant || inOptions) return [definition, style];
        }
    }
    const fallback = sectionDefinitions.find((definition) =>
        definition.styles.some((style) => style.type === block.type),
    );
    const style = fallback?.styles.find((other) => other.type === block.type);
    return fallback && style ? [fallback, style] : [TITLE, TITLE.styles[0]];
}

/** Reads the sections out of a list of blocks. A block with no section id is a section by itself. */
export function sectionsOf(blocks: readonly Block[]): Section[] {
    const groups: Block[][] = [];
    for (const block of blocks) {
        const last = groups.at(-1);
        const lastId = last?.[0]?.section;
        if (last && block.section && lastId === block.section) last.push(block);
        else groups.push([block]);
    }
    return groups.flatMap((all) => {
        const first = all[0];
        if (!first) return [];
        const title = first.type === "heading" && all.length > 1 ? first : undefined;
        const content = title ? all.slice(1) : all;
        const [definition, style] = matchStyle(content[0] ?? first);
        return {
            id: first.section ?? first.id,
            definition,
            style,
            ...(title ? { title } : {}),
            blocks: content,
            all,
        };
    });
}

export interface FoundSection {
    section: Section;
    index: number;
    list: Section[];
    place?: Place;
}

/** Finds a section by its id, or by the id of any block in it, including inside tabs. */
export function findSection(page: Page, id: string): FoundSection | null {
    const look = (blocks: readonly Block[], place?: Place): FoundSection | null => {
        const list = sectionsOf(blocks);
        const index = list.findIndex(
            (section) => section.id === id || section.all.some((block) => block.id === id),
        );
        const section = list[index];
        return section ? { section, index, list, ...(place ? { place } : {}) } : null;
    };
    const top = look(page.blocks);
    if (top) return top;
    for (const block of page.blocks) {
        if (block.type !== "tabs") continue;
        for (const tab of block.tabs) {
            const inside = look(tab.blocks, { tabs: block.id, tab: tab.id });
            if (inside) return inside;
        }
    }
    return null;
}

function withBlocks(page: Page, place: Place | undefined, blocks: Block[]): Page {
    if (!place) return { ...page, blocks };
    return {
        ...page,
        blocks: page.blocks.map((block) =>
            block.type === "tabs" && block.id === place.tabs
                ? {
                      ...block,
                      tabs: block.tabs.map((tab) =>
                          tab.id === place.tab
                              ? { ...tab, blocks: blocks as typeof tab.blocks }
                              : tab,
                      ),
                  }
                : block,
        ),
    };
}

function replaceSection(page: Page, found: FoundSection, next: Block[]): Page {
    const blocks = found.list.flatMap((section) =>
        section.id === found.section.id ? next : section.all,
    );
    return withBlocks(page, found.place, blocks);
}

function seeded(seed: BlockSeed, section: string, makeId: MakeId): Block {
    const ids = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(ids);
        if (typeof value !== "object" || value === null) return value;
        return Object.fromEntries(
            Object.entries(value).map(([key, inner]) => [
                key,
                key === "id" ? makeId() : ids(inner),
            ]),
        );
    };
    return blockSchemaUnion.parse({ ...(ids(seed) as object), id: makeId(), section });
}

/** Builds a new section's blocks, with its usual title. */
export function makeSection(
    definition: SectionDefinition,
    makeId: MakeId,
    styleId?: string,
): Block[] {
    const style =
        definition.styles.find((other) => other.id === styleId && styleAvailable(other)) ??
        definition.styles.find(styleAvailable) ??
        definition.styles[0];
    const section = makeId();
    const blocks = definition.sample(style).map((seed) => seeded(seed, section, makeId));
    if (!definition.title) return blocks;
    const title: Block = {
        id: makeId(),
        type: "heading",
        variant: "plain",
        text: definition.title,
        section,
    };
    return [title, ...blocks];
}

/** Puts a section in a list, at a position counted in sections. */
export function addSection(page: Page, blocks: Block[], at: number, place?: Place): Page {
    if (place && blocks.some((block) => block.type === "tabs")) return page;
    const list = place
        ? ((
              page.blocks.find((block) => block.id === place.tabs) as
                  Extract<Block, { type: "tabs" }> | undefined
          )?.tabs.find((tab) => tab.id === place.tab)?.blocks ?? [])
        : page.blocks;
    const sections = sectionsOf(list);
    const before = sections.slice(0, at).flatMap((section) => section.all);
    const after = sections.slice(at).flatMap((section) => section.all);
    return withBlocks(page, place, [...before, ...blocks, ...after]);
}

export function moveSection(page: Page, id: string, to: number): Page {
    const found = findSection(page, id);
    if (!found || to < 0 || to >= found.list.length || to === found.index) return page;
    const order = [...found.list];
    order.splice(found.index, 1);
    order.splice(to, 0, found.section);
    return withBlocks(
        page,
        found.place,
        order.flatMap((section) => section.all),
    );
}

export function removeSection(page: Page, id: string): Page {
    const found = findSection(page, id);
    return found ? replaceSection(page, found, []) : page;
}

/** Returns the page and the copy's id, placed directly below the original. */
export function duplicateSection(page: Page, id: string, makeId: MakeId): [Page, string | null] {
    const found = findSection(page, id);
    if (!found) return [page, null];
    const section = makeId();
    const fresh = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(fresh);
        if (typeof value !== "object" || value === null) return value;
        return Object.fromEntries(
            Object.entries(value).map(([key, inner]) => [
                key,
                key === "id" ? makeId() : fresh(inner),
            ]),
        );
    };
    const copy = found.section.all.map((block) => {
        const { highlight: _highlight, ...rest } = fresh(block) as Block;
        return { ...rest, section };
    });
    const next = replaceSection(page, found, [...found.section.all, ...copy]);
    return [next, section];
}

export function setSectionTitle(page: Page, id: string, text: string, makeId: MakeId): Page {
    const found = findSection(page, id);
    if (!found) return page;
    const { section } = found;
    if (!text) return replaceSection(page, found, section.blocks);
    if (section.title) {
        return replaceSection(page, found, [{ ...section.title, text }, ...section.blocks]);
    }
    // Giving a lone block a title ties them together, so it needs a section id if it had none.
    const sectionId = section.blocks[0]?.section ?? makeId();
    const title: Block = {
        id: makeId(),
        type: "heading",
        variant: "plain",
        text,
        section: sectionId,
    };
    return replaceSection(page, found, [
        title,
        ...section.blocks.map((block) => ({ ...block, section: sectionId })),
    ]);
}

export function setSectionBigTitle(page: Page, id: string, big: boolean): Page {
    const found = findSection(page, id);
    if (!found?.section.title) return page;
    const title = {
        ...found.section.title,
        variant: big ? ("large" as const) : ("plain" as const),
    };
    return replaceSection(page, found, [title, ...found.section.blocks]);
}

type SharedKey = "hidden" | "showFrom" | "showUntil" | "tint";

/** These apply to every block in a section, so it shows, hides and tints as one. */
export function setSectionShared(page: Page, id: string, key: SharedKey, value: unknown): Page {
    const found = findSection(page, id);
    if (!found) return page;
    const next = found.section.all.map((block) => {
        const { [key]: _old, ...rest } = block;
        return value === undefined || value === false || value === ""
            ? rest
            : { ...rest, [key]: value };
    });
    return replaceSection(page, found, next);
}

const fromLink = (block: Block, style: SectionStyle, n: number): BlockSeed | null => {
    if (block.type !== "button" && block.type !== "link-card") return null;
    const text = block.type === "button" ? block.text : block.title;
    const sub = block.type === "link-card" ? (block.text ?? "") : "";
    return linkSeed(style, text, sub, block.url, n + 1);
};

/**
 * Changes a section's style. Within one kind of block this only changes the layout. Between kinds it
 * makes new content, unless `earlier` offers what this section last had in that style.
 */
export function setSectionStyle(
    page: Page,
    id: string,
    styleId: string,
    makeId: MakeId,
    earlier?: readonly Block[],
): Page {
    const found = findSection(page, id);
    const style = found?.section.definition.styles.find((other) => other.id === styleId);
    if (!found || !style || !styleAvailable(style)) return page;
    const { section } = found;
    const sectionId = section.blocks[0]?.section ?? makeId();
    const shared = (block: Block) => {
        const { hidden, showFrom, showUntil, tint } = block;
        return {
            ...(hidden ? { hidden } : {}),
            ...(showFrom ? { showFrom } : {}),
            ...(showUntil ? { showUntil } : {}),
            ...(tint ? { tint } : {}),
        };
    };
    const first = section.blocks[0];
    if (!first) return page;
    let content: Block[];
    if (section.blocks.every((block) => block.type === style.type)) {
        content = section.blocks.map((block) => ({ ...block, variant: style.variant }) as Block);
    } else if (section.definition.key === "links") {
        content = section.blocks.flatMap((block, i) => {
            const seed = fromLink(block, style, i);
            return seed
                ? [
                      blockSchemaUnion.parse({
                          ...seed,
                          ...shared(block),
                          id: block.id,
                          section: sectionId,
                      }),
                  ]
                : [];
        });
    } else if (earlier?.length) {
        content = earlier.map(
            (block) => ({ ...block, variant: style.variant, ...shared(first) }) as Block,
        );
    } else {
        content = section.definition
            .sample(style)
            .map((seed) => ({ ...seeded(seed, sectionId, makeId), ...shared(first) }));
    }
    return replaceSection(page, found, [...(section.title ? [section.title] : []), ...content]);
}

/** Adds one more link to a Links section, in the section's style. */
export function addLinkToSection(
    page: Page,
    id: string,
    makeId: MakeId,
    url = "",
    text = "",
): Page {
    const found = findSection(page, id);
    if (found?.section.definition.key !== "links") return page;
    const sectionId = found.section.blocks[0]?.section ?? makeId();
    const seed = linkSeed(
        found.section.style,
        text || "New link",
        "",
        url,
        found.section.blocks.length,
    );
    const block = seeded(seed, sectionId, makeId);
    const blocks = found.section.blocks.map((other) => ({ ...other, section: sectionId }));
    return replaceSection(page, found, [
        ...found.section.all.slice(0, -blocks.length),
        ...blocks,
        block,
    ]);
}

const SAMPLE_WORDS = new Set([
    "Say what you do, who it's for and why you enjoy it. Two or three lines is plenty.",
    "First service",
    "First event",
    "How does it work?",
    "A happy client",
]);

function usesSampleWords(block: Block): boolean {
    if (block.type === "text") return SAMPLE_WORDS.has(block.text);
    if (block.type === "services" || block.type === "events") {
        return block.items.some((entry) => SAMPLE_WORDS.has(entry.name));
    }
    if (block.type === "faq") return block.items.some((entry) => SAMPLE_WORDS.has(entry.question));
    if (block.type === "quotes")
        return block.items.some((entry) => SAMPLE_WORDS.has(entry.by ?? ""));
    return false;
}

/** What's left to do in a section, in plain words, or null if it's ready. */
export function sectionStatus(section: Section): string | null {
    const problem = section.blocks.map(blockProblem).find(Boolean);
    if (section.blocks.some((block) => block.type !== "tabs" && hasPlaceholder(block))) {
        return section.definition.key === "photos" ? "Add your photos" : "Add a photo";
    }
    if (problem) {
        if (section.definition.key === "find") return "Add your details";
        if (section.definition.key === "links") return "Add your links";
        if (section.definition.key === "bookings") return "Add your booking link";
        return "Add a link";
    }
    if (section.blocks.some(usesSampleWords)) {
        return section.definition.key === "about"
            ? "Write a few words"
            : section.definition.key === "proof"
              ? "Add real words"
              : "Add your details";
    }
    return null;
}

/** Where a pasted link belongs. */
export function routeLink(url: string): { key: string; label: string } {
    const lower = url.toLowerCase();
    if (/calendly\.com|cal\.com/.test(lower)) return { key: "bookings", label: "Add to Bookings" };
    if (/spotify\.com|music\.apple|soundcloud/.test(lower)) {
        return { key: "media", label: "Add as music" };
    }
    if (/youtube\.com\/watch|youtu\.be|vimeo\.com/.test(lower)) {
        return { key: "media", label: "Add as a video" };
    }
    if (
        /^mailto:|^tel:|instagram\.com|tiktok\.com|youtube\.com|x\.com|linkedin\.com|facebook\.com|wa\.me/.test(
            lower,
        )
    ) {
        return { key: "find", label: "Add to Socials and contact" };
    }
    return { key: "links", label: "Add to Links" };
}
