import { blockSchema, defineBlock, escapeHtml } from "../define-block";

export const divider = defineBlock({
    schema: blockSchema("divider", ["space", "line", "paint"], {}),
    name: "Divider",
    group: "words",
    layouts: { space: { label: "Space" }, line: { label: "Line" }, paint: { label: "Paint" } },
    fields: [],
    make: () => ({ type: "divider" as const, variant: "line" as const }),
    css: `.b-div{height:34px}.b-div-line{height:1px;margin:24px 0;background:var(--line)}.b-div-paint{display:block;margin:18px -18px;color:var(--acc)}.b-div-paint svg{display:block;width:100%;height:46px}`,
    render: (block) => {
        if (block.variant === "space") return `<div class="b-div"></div>`;
        if (block.variant === "line") return `<div class="b-div-line"></div>`;
        const id = escapeHtml(`d-${block.id}`);
        return `<div class="b-div-paint"><svg viewBox="0 0 400 46" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="${id}" x="-5%" y="-40%" width="110%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="16"/></filter></defs><g filter="url(#${id})" fill="currentColor"><ellipse cx="130" cy="24" rx="170" ry="9" opacity=".55"/><ellipse cx="270" cy="22" rx="130" ry="7" opacity=".4"/></g></svg></div>`;
    },
});
