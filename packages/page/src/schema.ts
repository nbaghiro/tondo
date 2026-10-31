import { z } from "zod";
import { blockSchemaUnion } from "./blocks";
import { linkValue, photoValue } from "./define-block";
import { isReservedHandle, isValidHandle } from "./handle";

export const handleSchema = z
    .string()
    .refine(isValidHandle, "Use 1 to 30 lowercase letters, numbers or hyphens.")
    .refine((handle) => !isReservedHandle(handle), "That address is reserved.");

// Render fills in each look. Its record is keyed by this list, so a missing look won't compile.
export const lookNames = ["madder", "dusk"] as const;
export const lookNameSchema = z.enum(lookNames);
export type LookName = z.output<typeof lookNameSchema>;

export const linkTypes = [
    "instagram",
    "tiktok",
    "youtube",
    "spotify",
    "apple",
    "globe",
    "mail",
    "phone",
    "chat",
    "pin",
] as const;

/** "look" is whatever the look draws for itself. The others work in every look. */
export const headerLayouts = ["look", "centred", "left", "full", "arch", "banner"] as const;

const headerSchema = z.strictObject({
    layout: z.enum(headerLayouts),
    name: z.string().max(80),
    tagline: z.string().max(120).optional(),
    bio: z.string().max(280).optional(),
    photo: photoValue.optional(),
    links: z
        .array(
            z.strictObject({
                id: z.string().min(1),
                type: z.enum(linkTypes),
                value: linkValue,
            }),
        )
        .max(12),
    buttonText: z.string().max(40).optional(),
    buttonUrl: linkValue.optional(),
});

const colour = z.string().regex(/^#[0-9a-f]{6}$/i);

export const PAGE_VERSION = 1;

/** One page's content. Its address belongs to the user, so it isn't stored here. */
export const pageSchema = z.strictObject({
    version: z.literal(PAGE_VERSION),
    look: lookNameSchema,
    /** The chosen paint colours. Leaving this out uses the look's own. */
    paint: z.array(colour).min(1).max(6).optional(),
    /** Which painting. Leaving this out uses the look's own. */
    seed: z.number().int().min(1).optional(),
    header: headerSchema,
    blocks: z.array(blockSchemaUnion).max(200),
});

export type Page = z.output<typeof pageSchema>;
export type Header = Page["header"];
