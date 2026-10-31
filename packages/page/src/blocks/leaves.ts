import { z } from "zod";
import type { BlockDefinition } from "../define-block";
import { button } from "./button";
import { heading } from "./heading";
import { linkCard } from "./link-card";

// Adding a block: copy a block file, change it, then add it to both lists here.
export const leafSchemaUnion = z.discriminatedUnion("type", [
    heading.schema,
    button.schema,
    linkCard.schema,
]);

export type LeafBlock = z.output<typeof leafSchemaUnion>;

export const leafDefinitions: Record<LeafBlock["type"], BlockDefinition> = {
    heading,
    button,
    "link-card": linkCard,
};
