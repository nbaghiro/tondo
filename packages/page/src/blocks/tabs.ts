import { z } from "zod";
import { blockSchema, defineBlock, escapeHtml, wrapBlock } from "../define-block";
import { list, text } from "../fields";
import type { RenderContext } from "../define-block";
import { leafDefinitions, leafSchemaUnion } from "./leaves";
import type { LeafBlock } from "./leaves";

export function drawLeaf(block: LeafBlock, ctx: RenderContext): string {
    const definition = leafDefinitions[block.type];
    try {
        return wrapBlock(block, definition.name, definition.draw(block, ctx), ctx);
    } catch (error) {
        ctx.onDrawError?.(block.type, error);
        return "";
    }
}

/** Works without a script, using a radio button per tab. */
export const tabs = defineBlock({
    // Holding only leaf blocks is what stops tabs containing tabs.
    schema: blockSchema("tabs", ["pills"], {
        tabs: z
            .array(
                z.strictObject({
                    id: z.string().min(1),
                    label: z.string().max(16),
                    blocks: z.array(leafSchemaUnion).max(60),
                }),
            )
            .min(2)
            .max(4),
    }),
    name: "Tabs",
    group: "details",
    layouts: { pills: { label: "Pills" } },
    fields: [
        list("tabs", "Tabs", {
            title: "label",
            add: "Add a tab",
            max: 4,
            hint: "Click a tab on your page, then add blocks from the shelf. They go in that tab.",
            fields: [text("label", "Name", { max: 16 })],
            make: () => ({ label: "New tab", blocks: [] }),
        }),
    ],
    make: () => ({
        type: "tabs" as const,
        variant: "pills" as const,
        tabs: [
            { id: "first", label: "First", blocks: [] },
            { id: "second", label: "Second", blocks: [] },
        ],
    }),
    css: `.b-tabs{margin-top:18px}.b-tabs>input{position:absolute;opacity:0;pointer-events:none}.b-tabbar{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.b-tabbar label{flex:1;text-align:center;white-space:nowrap;font-weight:600;font-size:14.5px;padding:9px 12px;border-radius:var(--rb);border:1px solid var(--line);cursor:pointer}.b-panel{display:none}
.t0:checked~.p0,.t1:checked~.p1,.t2:checked~.p2,.t3:checked~.p3{display:block}.t0:checked~.b-tabbar .l0,.t1:checked~.b-tabbar .l1,.t2:checked~.b-tabbar .l2,.t3:checked~.b-tabbar .l3{background:var(--btn);color:var(--btnfg);border-color:var(--btn)}.t0:focus-visible~.b-tabbar .l0,.t1:focus-visible~.b-tabbar .l1,.t2:focus-visible~.b-tabbar .l2,.t3:focus-visible~.b-tabbar .l3{outline:2px solid var(--acc);outline-offset:2px}`,
    render: (block, ctx) => {
        const name = escapeHtml(`tabs-${block.id}`);
        const inputs = block.tabs
            .map(
                (_, i) =>
                    `<input type="radio" name="${name}" id="${name}-${String(i)}" class="t${String(i)}"${i ? "" : " checked"}>`,
            )
            .join("");
        const labels = block.tabs
            .map(
                (tab, i) =>
                    `<label for="${name}-${String(i)}" class="l${String(i)}">${escapeHtml(tab.label)}</label>`,
            )
            .join("");
        const panels = block.tabs
            .map(
                (tab, i) =>
                    `<div class="b-panel p${String(i)}" data-tab="${escapeHtml(tab.id)}">${
                        tab.blocks.length || !ctx.editable
                            ? tab.blocks.map((inner) => drawLeaf(inner, ctx)).join("")
                            : '<div class="t-tab-empty">This tab is empty. Add a block from the shelf.</div>'
                    }</div>`,
            )
            .join("");
        return `<div class="b-tabs">${inputs}<div class="b-tabbar">${labels}</div>${panels}</div>`;
    },
});
