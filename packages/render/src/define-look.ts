export interface HeaderParts {
    art: string;
    /** The photo alone, for looks that frame it themselves. Empty if there is none. */
    image: string;
    /** The photo in a round frame. */
    avatar: string;
    name: string;
    tagline: string;
    bio: string;
    links: string;
    button: string;
}

export interface Look {
    label: string;
    /** The Google Fonts families this look needs. */
    fonts: string;
    palette: readonly string[];
    seed: number;
    screen?: boolean;
    /** Draws a brush ring of this width instead of a painting. */
    ring?: number;
    /** The look's variables, and any rules that style a block or header differently in this look. */
    css: string;
    /** The look's signature header. It only draws from the header's fields. */
    header?: (parts: HeaderParts) => string;
}

/** Every look file calls this, which is what keeps them all the same shape. */
export function defineLook(look: Look): Look {
    return look;
}
