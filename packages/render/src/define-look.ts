export interface Look {
    label: string;
    /** The Google Fonts families this look needs. */
    fonts: string;
    palette: readonly string[];
    seed: number;
    screen?: boolean;
    /** The look's variables, and any rules that style a block or header differently in this look. */
    css: string;
}

/** Every look file calls this, which is what keeps them all the same shape. */
export function defineLook(look: Look): Look {
    return look;
}
