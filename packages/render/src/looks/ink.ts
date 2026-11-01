import { defineLook } from "../define-look";

export const ink = defineLook({
    label: "Ink",
    fonts: "family=Pirata+One&family=Zen+Kaku+Gothic+New:wght@400;500;700",
    palette: ["#e23a2e"],
    seed: 19,
    ring: 12,
    css: `.ink{--sel:#e23a2e;--bg:#0b0b0b;--fg:#f0ece4;--mut:#a39d91;--card:#171514;--cardfg:#f0ece4;--line:#3a3532;--btn:#c32118;--btnfg:#fff;--acc:#e23a2e;--disp:"Pirata One",serif;--dw:400;--body:"Zen Kaku Gothic New",sans-serif;--r:2px;--rb:2px;--hal:center}.ink .p-head h1{font-size:40px;line-height:1;max-width:7em;margin:auto}.ink .b-head{font-size:30px}.ink .p-head{padding-top:96px;min-height:372px;padding-inline:44px}.ink .p-paint{width:350px;left:50%;margin-left:-175px;top:14px}.ink .h-after{text-align:center}.ink .h-after .b-social{justify-content:center}.ink .h-after p{margin-inline:auto}.ink .p-av{width:84px;height:84px}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><header class="p-head">${p.avatar}${p.name}${p.tagline}</header><div class="h-after">${p.bio}${p.links}</div>`,
});
