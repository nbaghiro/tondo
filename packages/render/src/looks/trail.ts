import { defineLook, picture } from "../define-look";

export const trail = defineLook({
    label: "Trail",
    fonts: "family=Bitter:wght@400;700&family=Karla:wght@400;500;700",
    palette: ["#c2571a", "#c2571a", "#b7a982"],
    seed: 5,
    css: `.trail{--sel:#c2571a;--bg:#e7ddc2;--fg:#2f2a1a;--mut:#5f573e;--card:#f4eedb;--cardfg:#2f2a1a;--line:#b7a982;--btn:#c2571a;--btnfg:#fff;--acc:#c2571a;--disp:Bitter,serif;--dw:700;--body:Karla,sans-serif;--r:6px;--rb:6px;--hal:left;--line-b:1.5px solid #2f2a1a}.trail .p-head{text-align:left;padding-top:16px}.trail .p-head h1{font-size:34px;line-height:1.05}.trail .p-head p{margin-left:0}.trail .b-social{justify-content:flex-start}`,
    header: (p) =>
        `<div class="p-banner">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
