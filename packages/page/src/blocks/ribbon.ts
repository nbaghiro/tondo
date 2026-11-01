import { z } from "zod";
import { blockSchema, defineBlock, editableText, escapeHtml } from "../define-block";
import { text } from "../fields";

// The words run along the curve with an SVG animation, so a page still needs no script.
function wave(id: string, text: string): string {
    const unit = `${text}  ✦  `;
    const period = Math.round(Array.from(unit).length * 12.4);
    const count = 8;
    const key = `w-${escapeHtml(id)}`;
    const curve = Array.from({ length: 12 }, () => "q65 -30 130 0 t130 0").join(" ");
    const run = escapeHtml(unit.repeat(count));
    const line = `fill="var(--btnfg)" font-family="var(--disp)" font-weight="700" font-size="17" dy="6" textLength="${String(period * count)}" lengthAdjust="spacing"`;
    const seconds = (period / 30).toFixed(1);
    return `<div class="b-wave"><svg viewBox="0 0 390 74" role="img" aria-label="${escapeHtml(text)}"><path id="${key}" d="M-40 44 ${curve}" fill="none" stroke="var(--btn)" stroke-width="40"/><text class="w-go" ${line}><textPath href="#${key}" xml:space="preserve">${run}<animate attributeName="startOffset" from="-${String(period)}" to="0" dur="${seconds}s" repeatCount="indefinite"/></textPath></text><text class="w-still" ${line}><textPath href="#${key}" xml:space="preserve">${run}</textPath></text></svg></div>`;
}

export const ribbon = defineBlock({
    schema: blockSchema("ribbon", ["moving", "still", "wave"], { text: z.string().max(60) }),
    name: "Ribbon",
    group: "words",
    layouts: { moving: { label: "Moving" }, still: { label: "Still" }, wave: { label: "Wave" } },
    fields: [text("text", "Message", { max: 60 })],
    make: () => ({
        type: "ribbon" as const,
        variant: "moving" as const,
        text: "New work on Friday",
    }),
    css: `.b-wave{margin:16px -18px 6px;overflow:hidden}.b-wave svg{display:block;width:100%;height:auto}.b-wave .w-still{display:none}@media(prefers-reduced-motion:reduce){.b-wave .w-go{display:none}.b-wave .w-still{display:block}}
.b-rib{overflow:hidden;margin:20px -18px 2px;background:var(--acc);color:var(--ribfg,#fff);font-weight:700;padding:9px 0;transform:rotate(-1.5deg) scale(1.02)}.b-rib>div{display:flex;width:max-content;align-items:center;gap:14px;animation:rib 26s linear infinite}.b-rib i{width:8px;height:8px;border-radius:50%;background:currentColor}@keyframes rib{to{transform:translateX(-50%)}}.b-rib-still{transform:none;text-align:center;padding-inline:18px}@media(prefers-reduced-motion:reduce){.b-rib>div{animation:none}}`,
    render: (block, ctx) => {
        if (!block.text) return "";
        if (block.variant === "still") {
            return `<div class="b-rib b-rib-still">${editableText(ctx, "span", "text", block.text)}</div>`;
        }
        const words = escapeHtml(block.text);
        if (block.variant === "wave") return wave(block.id, block.text);
        const run = `<span>${words}</span><i></i>`.repeat(12);
        return `<div class="b-rib" role="img" aria-label="${words}"><div>${run}</div></div>`;
    },
});
