import { defineLook } from "../define-look";

export const stacks = defineLook({
    label: "Stacks",
    fonts: "family=Courier+Prime:wght@400;700&family=Libre+Franklin:wght@400;600;700",
    palette: ["#5b2a86", "#5b2a86", "#a9b5ad"],
    seed: 54,
    css: `.stacks{--sel:#5b2a86;--bg:#dfe8dc;--fg:#23303a;--mut:#56626a;--card:#fdf9ec;--cardfg:#23303a;--line:#a9b5ad;--btn:#5b2a86;--btnfg:#fff;--acc:#5b2a86;--disp:"Courier Prime",monospace;--dw:700;--body:"Libre Franklin",sans-serif;--r:3px;--rb:3px;--hal:left}.stacks .p-lib{position:relative;margin-top:30px;padding:18px 16px;background:#fdf9ec;border:1px solid #a9b5ad;box-shadow:3px 3px 0 #a9b5ad;font:400 15px "Courier Prime",monospace}.stacks .p-lib h1{margin:0 0 10px;font:700 31px/1.08 "Courier Prime",monospace}.stacks .p-lib dl{margin:0}.stacks .p-lib div{display:flex;justify-content:space-between;border-top:1px solid #c5cfc6;padding:6px 0}.stacks .p-lib dd{margin:0;font-weight:700}.stacks .b-social{justify-content:flex-start;margin-top:18px}.stacks .b-head{font-size:21px}.stacks .p-av{margin:0 0 12px}.stacks .p-lib .p-tag{color:var(--fg);display:block;margin-top:8px}.stacks .p-lib p{color:var(--fg);margin:6px 0 0;font-size:15px}`,
    header: (p) =>
        `<header class="p-lib">${p.avatar}${p.name}${p.tagline}${p.bio}</header><div class="h-after">${p.links}</div>`,
});
