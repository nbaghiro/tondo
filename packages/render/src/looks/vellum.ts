import { defineLook } from "../define-look";

export const vellum = defineLook({
    label: "Vellum",
    fonts: "family=Cormorant+Garamond:ital,wght@0,400;0,500;1,500&family=Mulish:wght@400;500;600;700",
    palette: ["#6d7a55"],
    seed: 11,
    ring: 9,
    css: `.vellum{--sel:#6d7a55;--bg:#faf6ef;--fg:#3a3226;--mut:#7a6d5a;--card:#fffdf8;--cardfg:#3a3226;--line:#e3d8c5;--btn:#6d7a55;--btnfg:#fff;--acc:#6d7a55;--disp:"Cormorant Garamond",serif;--dw:500;--body:Mulish,sans-serif;--r:2px;--rb:2px;--hal:center}.vellum .p-paint{width:330px;left:50%;margin-left:-165px;top:16px}.vellum .p-head{padding-top:92px;min-height:352px}.vellum .p-head h1{font-size:46px;line-height:1.02;font-style:italic}.vellum .b-head{font-size:27px}.vellum .b-count b{font-size:84px}.vellum .h-after{text-align:center}.vellum .h-after .b-social{justify-content:center}.vellum .h-after p{margin-inline:auto}.vellum .p-av{width:84px;height:84px}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><header class="p-head">${p.avatar}${p.name}${p.tagline}</header><div class="h-after">${p.bio}${p.links}</div>`,
});
