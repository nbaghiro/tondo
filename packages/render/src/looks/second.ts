import { defineLook, picture } from "../define-look";

export const second = defineLook({
    label: "Second Street",
    fonts: "family=Alfa+Slab+One&family=Karla:wght@400;500;700",
    palette: ["#e4b04a", "#e4b04a", "#38503f"],
    seed: 41,
    css: `.second{--sel:#e4b04a;--bg:#14251e;--fg:#f2ead8;--mut:#b6b8a4;--card:#1d3229;--cardfg:#f2ead8;--line:#38503f;--btn:#e4b04a;--btnfg:#14251e;--acc:#e4b04a;--ribfg:#14251e;--disp:"Alfa Slab One",serif;--dw:400;--body:Karla,sans-serif;--r:4px;--rb:4px;--hal:left}.second .p-head{text-align:left;padding-top:0;margin-top:-52px;position:relative}.second .p-head h1{font-size:40px;line-height:1.04}.second .p-head p{margin-left:0}.second .b-social{justify-content:flex-start}`,
    header: (p) =>
        `<div class="p-full">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
