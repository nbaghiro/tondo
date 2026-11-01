import { z } from "zod";
import { wrapBlock } from "../define-block";
import type { BlockDefinition, RenderContext } from "../define-block";
import { leafDefinitions, leafSchemaUnion } from "./leaves";
import type { LeafBlock } from "./leaves";
import { tabs } from "./tabs";

export { leafSchemaUnion };
export type { LeafBlock };

export const blockSchemaUnion = z.discriminatedUnion("type", [
    ...leafSchemaUnion.options,
    tabs.schema,
]);

export type Block = z.output<typeof blockSchemaUnion>;
export type BlockType = Block["type"];

export const blockDefinitions: Record<BlockType, BlockDefinition> = { ...leafDefinitions, tabs };

export const blockTypes = Object.keys(blockDefinitions).filter(
    (type): type is BlockType => type in blockDefinitions,
);

/** What the shelf offers. Held blocks still render, because saved pages may use them. */
export const availableBlockTypes = blockTypes.filter((type) => !blockDefinitions[type].held);

/** One block that can't be drawn is left out, so it can never take the whole page down. */
export function drawBlock(block: Block, ctx: RenderContext): string {
    const definition = blockDefinitions[block.type];
    try {
        return wrapBlock(block, definition.name, definition.draw(block, ctx), ctx);
    } catch (error) {
        ctx.onDrawError?.(block.type, error);
        return "";
    }
}

/** Every block on the page, including those inside tabs. */
export function allBlocks(blocks: readonly Block[]): Block[] {
    return blocks.flatMap((block) =>
        block.type === "tabs" ? [block, ...block.tabs.flatMap((tab) => tab.blocks)] : [block],
    );
}
