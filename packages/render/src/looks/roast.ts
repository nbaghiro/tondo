import { defineLook, picture } from "../define-look";

export const roast = defineLook({
    label: "Roast",
    fonts: "family=Abril+Fatface&family=Figtree:wght@400;500;600;700",
    palette: ["#e8a75d", "#b5562a", "#f2c98a", "#7a3218"],
    seed: 37,
    screen: true,
    css: `.roast{--sel:#e8a75d;--bg:#2b1710;--fg:#f6e7d3;--mut:#c9ae93;--card:#3a2118;--cardfg:#f6e7d3;--line:#5b3a2b;--btn:#e8a75d;--btnfg:#2b1710;--acc:#e8a75d;--ribfg:#2b1710;--disp:"Abril Fatface",serif;--dw:400;--body:Figtree,sans-serif;--r:20px;--hal:center}.roast .p-rond{position:relative;width:286px;height:286px;margin:30px auto 0}.roast .p-rond .p-paint{inset:-46px;width:auto;margin:0;left:-46px;top:-46px;right:-46px}.roast .p-rond>span{position:absolute;inset:0;border-radius:50%;overflow:hidden}.roast .p-head{padding-top:44px}.roast .p-head h1{font-size:43px;line-height:1.02}`,
    header: (p) =>
        `<div class="p-rond"><div class="p-paint">${p.art}</div><span>${picture(p)}</span></div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
