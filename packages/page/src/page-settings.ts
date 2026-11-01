import type { LookName, Page, PageStyle } from "./schema";

// Choices that belong to the whole page rather than to one block.

/** A person's own colour stays with them. Everything else belongs to the new look. */
export function setLook(page: Page, look: LookName): Page {
    const { paint: _paint, seed: _seed, style, ...rest } = page;
    const colour = style?.colour;
    const kept = colour && (colour.mode === "brand" || colour.mode === "photo");
    return kept ? { ...rest, look, style: { colour } } : { ...rest, look };
}

export function setStyle(page: Page, patch: Partial<PageStyle>): Page {
    const { style, ...rest } = page;
    const clean = Object.fromEntries(
        Object.entries({ ...style, ...patch }).filter(([, value]) => value !== undefined),
    ) as PageStyle;
    return Object.keys(clean).length ? { ...rest, style: clean } : rest;
}

export function resetStyle(page: Page): Page {
    const { style: _style, seed: _seed, ...rest } = page;
    return rest;
}

export function setPageText(page: Page, key: "title" | "description", value: string): Page {
    const { [key]: _old, ...rest } = page;
    return value ? { ...rest, [key]: value } : rest;
}

export function setPaint(page: Page, paint: string[] | undefined): Page {
    const { paint: _old, ...rest } = page;
    return paint ? { ...rest, paint } : rest;
}

export const setSeed = (page: Page, seed: number): Page => ({ ...page, seed });
