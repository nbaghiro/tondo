import { z } from "zod";
import { blockSchemaUnion } from "./blocks";
import { isReservedHandle, isValidHandle } from "./handle";
import { linkValue } from "./define-block";

export const handleSchema = z
    .string()
    .refine(isValidHandle, "Use 1 to 30 lowercase letters, numbers or hyphens.")
    .refine((handle) => !isReservedHandle(handle), "That address is reserved.");

// Render fills in each look. Its record is keyed by this list, so a missing look won't compile.
export const lookNames = ["madder", "dusk"] as const;
export const lookNameSchema = z.enum(lookNames);
export type LookName = z.output<typeof lookNameSchema>;

export const socialNetworks = [
    "instagram",
    "tiktok",
    "youtube",
    "spotify",
    "apple",
    "globe",
    "mail",
    "pin",
] as const;

const headerSchema = z.strictObject({
    name: z.string().max(80),
    tagline: z.string().max(120),
    bio: z.string().max(280),
    photo: z.string(),
    position: z.string().optional(),
    zoom: z.number().min(1).max(3).optional(),
    social: z.array(z.strictObject({ network: z.enum(socialNetworks), url: linkValue })).max(40),
});

const colour = z.string().regex(/^#[0-9a-f]{6}$/i);

/** One page's content. Its address belongs to the profile, so it isn't stored here. */
export const pageSchema = z.strictObject({
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
