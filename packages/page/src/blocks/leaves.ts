import { z } from "zod";
import type { BlockDefinition } from "../define-block";
import { button } from "./button";
import { gallery } from "./gallery";
import { heading } from "./heading";
import { linkCard } from "./link-card";
import { text } from "./text";

// Adding a block: copy a block file, change it, then add it to both lists here.
export const leafSchemaUnion = z.discriminatedUnion("type", [
    heading.schema,
    text.schema,
    button.schema,
    linkCard.schema,
    gallery.schema,
]);

export type LeafBlock = z.output<typeof leafSchemaUnion>;

export const leafDefinitions: Record<LeafBlock["type"], BlockDefinition> = {
    heading,
    text,
    button,
    "link-card": linkCard,
    gallery,
};
