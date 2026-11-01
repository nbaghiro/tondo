import { defineLook, picture } from "../define-look";

export const lume = defineLook({
    label: "Lume",
    fonts: "family=DM+Serif+Display:ital@0;1&family=Figtree:wght@400;500;600;700",
    palette: ["#a8461f", "#5a6220", "#d9d2b5"],
    seed: 20,
    css: `.lume{--sel:#a8461f;--bg:#f5efdd;--fg:#2f3218;--mut:#646644;--card:#fbf7e9;--cardfg:#2f3218;--line:#d9d2b5;--btn:#5a6220;--btnfg:#fbf7e9;--acc:#a8461f;--disp:"DM Serif Display",serif;--dw:400;--body:Figtree,sans-serif;--r:10px;--rb:10px;--hal:center}.lume .p-seal2{margin-top:-58px;position:relative;background:#5a6220;font-style:italic}.lume .p-head{padding-top:0}`,
    header: (p) =>
        `<div class="p-banner">${picture(p)}</div><header class="p-head"><div class="p-seal2">${p.initials}</div>${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
