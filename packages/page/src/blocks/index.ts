import { z } from "zod";
import type { BlockDefinition } from "../define-block";
import { button } from "./button";
import { heading } from "./heading";
import { linkCard } from "./link-card";

// Adding a block: copy a block file, change it, then add it to both lists here.
export const blockSchemaUnion = z.discriminatedUnion("type", [
    heading.schema,
    button.schema,
    linkCard.schema,
]);

export type Block = z.output<typeof blockSchemaUnion>;
export type BlockType = Block["type"];

export const blockDefinitions: Record<BlockType, BlockDefinition> = {
    heading,
    button,
    "link-card": linkCard,
};

export const blockTypes = Object.keys(blockDefinitions).filter(
    (type): type is BlockType => type in blockDefinitions,
);
