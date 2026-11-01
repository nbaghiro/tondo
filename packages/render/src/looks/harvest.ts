import { defineLook } from "../define-look";

export const harvest = defineLook({
    label: "Harvest",
    fonts: "family=Alegreya+Sans:wght@400;500;700&family=Stardos+Stencil:wght@700",
    palette: ["#b5301f", "#b5301f", "#3b2a17"],
    seed: 50,
    css: `.harvest{--sel:#b5301f;--bg:#f3e8d0;--fg:#3b2a17;--mut:#6a5536;--card:#fbf5e6;--cardfg:#3b2a17;--line:#3b2a17;--btn:#b5301f;--btnfg:#fff7e6;--acc:#b5301f;--disp:"Stardos Stencil",serif;--dw:700;--body:"Alegreya Sans",sans-serif;--r:3px;--rb:3px;--hal:left;--line-b:2px solid #3b2a17}.harvest .p-crate{margin:24px 0 0;padding:20px 16px 18px;background:repeating-linear-gradient(0deg,#d8bb88 0 56px,#c9a970 56px 59px);border:3px solid #3b2a17}.harvest .p-crate h1{margin:0;font:700 56px/.95 "Stardos Stencil",serif;color:#b5301f}.harvest .p-crate .p-tag{display:block;font-weight:700;margin-top:10px;font-size:16px}.harvest .b-head{font-size:27px}.harvest .b-social{justify-content:flex-start}.harvest .b-menu small{color:#6a5536}.harvest .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<header class="p-crate">${p.avatar}${p.name}${p.tagline}</header><div class="h-after">${p.bio}${p.links}</div>`,
});
