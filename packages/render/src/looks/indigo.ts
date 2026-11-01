import { defineLook } from "../define-look";

export const indigo = defineLook({
    label: "Indigo",
    fonts: "family=Karla:wght@400;500;700&family=Young+Serif",
    palette: ["#1f3a93", "#2b5fb8", "#16245f", "#6c8fd6"],
    seed: 3,
    css: `.indigo{--sel:#1b2f7d;--bg:#f3f5f7;--fg:#141f47;--mut:#4a5475;--card:#fff;--cardfg:#141f47;--line:#c6cede;--btn:#1b2f7d;--btnfg:#fff;--acc:#1b2f7d;--disp:"Young Serif",serif;--dw:400;--body:Karla,sans-serif;--r:4px;--rb:4px;--line-b:1px solid #141f47;--sh:6px 6px 0 rgba(31,58,147,.17)}.indigo .p-head{text-align:left;display:grid;grid-template-columns:96px 1fr;gap:15px;align-items:center;padding-top:38px}.indigo .p-av{width:96px;height:96px;margin:0;border-radius:4px;border:1px solid #141f47}.indigo .p-head p{margin-left:0}.indigo .b-social{justify-content:flex-start;margin-top:18px}.indigo .p-paint{width:230px;left:auto;right:-110px;margin:0;top:-120px;opacity:.75}.indigo .p-av img{transform:scale(1.5);transform-origin:50% 35%}.indigo .p-av{margin:0 0 12px}.indigo .p-head:not(:has(.p-av)){display:block}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><header class="p-head">${p.avatar}<div>${p.name}${p.tagline}</div></header><div class="h-after">${p.bio}${p.links}</div>`,
});
