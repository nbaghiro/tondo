import type { Block, BlockType } from "./blocks";
import type { linkTypes } from "./links";
import type { MakeId } from "./operations";
import { makeSection, sectionDefinition } from "./sections";

// What a new page starts with for each answer to "What's it mostly for?". These are sample words
// like any section's, so they stay off the live page until the person changes them. Prices and times reuse the
// sections' own samples, because a person's real price shouldn't read as a sample.

type Words = Record<string, unknown>;

interface StarterSection {
    key: string;
    title?: string;
    /** Laid over the section's own sample, block by block. */
    blocks?: readonly Words[];
}

export interface StarterUse {
    id: string;
    label: string;
    tagline: string;
    /** Social icons to show, each waiting for its link. */
    socials: readonly (typeof linkTypes)[number][];
    sections: readonly StarterSection[];
}

/** One strong button and one quiet one, so a new page doesn't start crowded. */
const links = (first: string, second: string) => [
    { text: first },
    { text: second, variant: "outline" },
];

export const starterUses: readonly StarterUse[] = [
    {
        id: "shop",
        label: "A shop",
        tagline: "Small batches, made and shipped by me",
        socials: ["instagram", "tiktok", "mail"],
        sections: [
            { key: "links", blocks: links("Shop everything", "Custom orders") },
            {
                key: "spotlight",
                blocks: [
                    {
                        title: "The new collection",
                        text: "A few pieces, made in small numbers. When they're gone, they're gone.",
                        cta: "See the collection",
                        tag: "Just in",
                    },
                ],
            },
            {
                key: "shop",
                title: "Best sellers",
                blocks: [
                    {
                        items: [
                            { name: "Your best seller", price: "$36" },
                            { name: "A new favourite", price: "$24" },
                            { name: "A gift for someone", price: "$36" },
                            { name: "Something small", price: "$24" },
                        ],
                    },
                ],
            },
            { key: "find" },
        ],
    },
    {
        id: "services",
        label: "My services",
        tagline: "Helping people like you, one session at a time",
        socials: ["instagram", "globe", "mail"],
        sections: [
            {
                key: "about",
                title: "How I can help",
                blocks: [
                    {
                        text: "Say who you work with and the difference you make. Most people come to me because they want this done properly.",
                    },
                ],
            },
            {
                key: "services",
                title: "Services and prices",
                blocks: [
                    {
                        cta: "Book now",
                        items: [
                            { name: "First session", detail: "30 minutes", price: "$40" },
                            { name: "Regular session", detail: "An hour", price: "$75" },
                            { name: "Full package", detail: "Half a day", price: "$185" },
                        ],
                    },
                ],
            },
            {
                key: "bookings",
                blocks: [
                    {
                        title: "Book a free intro call",
                        sub: "15 minutes to see if we're a good fit",
                        cta: "Pick a time",
                    },
                ],
            },
            {
                key: "proof",
                blocks: [
                    {
                        items: [
                            {
                                text: "I wish I'd booked sooner. Worth every penny.",
                                by: "A client",
                            },
                            { text: "Kind, clear and so easy to work with.", by: "Another client" },
                        ],
                    },
                ],
            },
            { key: "find" },
        ],
    },
    {
        id: "creator",
        label: "My creative work",
        tagline: "Making things and sharing how they're made",
        socials: ["instagram", "youtube", "tiktok"],
        sections: [
            { key: "banner", blocks: [{ text: "New work out now" }] },
            { key: "photos" },
            {
                key: "media",
                blocks: [
                    {
                        items: [
                            { title: "My latest piece", meta: "4 min" },
                            { title: "In the studio", meta: "6 min" },
                            { title: "Start to finish", meta: "9 min" },
                        ],
                    },
                ],
            },
            { key: "links", blocks: links("See my portfolio", "Work with me") },
        ],
    },
    {
        id: "place",
        label: "A place or event",
        tagline: "Come and see us. Everything you need to know is here",
        socials: ["instagram", "globe", "pin"],
        sections: [
            {
                key: "spotlight",
                blocks: [
                    {
                        title: "This weekend",
                        text: "Tell people what's on, when it starts and why they should come.",
                        cta: "Get the details",
                        tag: "Coming up",
                    },
                ],
            },
            {
                key: "events",
                title: "What's on",
                blocks: [
                    {
                        cta: "Get tickets",
                        items: [
                            { name: "Opening night", place: "Main room" },
                            { name: "Saturday market", place: "Out front" },
                        ],
                    },
                ],
            },
            { key: "photos" },
            { key: "find" },
        ],
    },
    {
        id: "me",
        label: "Just me",
        tagline: "A few words about you, and what you're up to",
        socials: ["instagram", "tiktok", "mail"],
        sections: [
            { key: "links", blocks: links("My website", "Say hello") },
            {
                key: "about",
                title: "A little about me",
                blocks: [
                    {
                        text: "Say what you do, what you care about and what you're working on now. Two or three lines is plenty.",
                    },
                ],
            },
            { key: "photos" },
        ],
    },
];

/** The page people see before they answer. */
export const defaultStarterUse = "me";

const useOf = (id: string): StarterUse | undefined =>
    starterUses.find((use) => use.id === id) ??
    starterUses.find((use) => use.id === defaultStarterUse);

export const starterTagline = (id: string): string => useOf(id)?.tagline ?? "";

const STARTER_LINK = "starter-";

/** Header icons that show a person where their links go. Empty ones never go live. */
export const starterLinks = (id: string) =>
    (useOf(id)?.socials ?? []).map((type) => ({ id: `${STARTER_LINK}${type}`, type, value: "" }));

/** An icon the page started with, and nobody has given a link yet. */
export const isUnfilledStarterLink = (link: { id: string; value: string }): boolean =>
    !link.value && link.id.startsWith(STARTER_LINK);

export const isStarterTagline = (line: string | undefined): boolean =>
    starterUses.some((use) => use.tagline === line);

function overlay(target: Words, words: Words, makeId: MakeId): Words {
    const next = { ...target };
    for (const [key, value] of Object.entries(words)) {
        if (!(key in target)) continue;
        const was = target[key];
        if (!Array.isArray(was) || !Array.isArray(value)) {
            next[key] = value;
            continue;
        }
        const rows = was as Words[];
        next[key] = (value as Words[]).map((entry, i) => ({
            ...rows[i % rows.length],
            ...entry,
            id: makeId(),
        }));
    }
    return next;
}

/** A section with the sample words for what the page is for. */
export function starterSection(useId: string, key: string, makeId: MakeId): Block[] {
    const definition = sectionDefinition(key);
    if (!definition) return [];
    const blocks = makeSection(definition, makeId);
    const words = useOf(useId)?.sections.find((section) => section.key === key);
    if (!words) return blocks;
    let index = 0;
    return blocks
        .map((block) => {
            if (definition.title && block === blocks[0]) {
                return { ...block, text: words.title ?? definition.title } as Block;
            }
            const extra = words.blocks?.[index];
            index += 1;
            return extra ? (overlay(block, extra, makeId) as Block) : block;
        })
        .slice(0, words.blocks ? words.blocks.length + (definition.title ? 1 : 0) : undefined);
}

interface StarterSample {
    type: BlockType;
    values: Words;
}

/** Every starter word, so the live page knows they're samples. */
export function starterSamples(): StarterSample[] {
    return starterUses.flatMap((use) =>
        use.sections.flatMap((section) => {
            const definition = sectionDefinition(section.key);
            const style = definition?.styles[0];
            if (!definition || !style) return [];
            return definition.sample(style).flatMap((seed, i): StarterSample[] => {
                const words = section.blocks?.[i];
                if (!words) return [];
                const values = overlay(seed, words, () => "");
                // A link's words carry over if its buttons become cards.
                return seed.type === "button"
                    ? [
                          { type: seed.type, values },
                          { type: "link-card", values: { title: words["text"] } },
                      ]
                    : [{ type: seed.type, values }];
            });
        }),
    );
}
