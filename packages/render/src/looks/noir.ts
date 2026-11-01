import { defineLook, picture } from "../define-look";

export const noir = defineLook({
    label: "Noir",
    fonts: "family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Figtree:wght@400;500;600;700",
    palette: ["#d6b47a", "#a57f4a", "#7a5a30", "#e8d5a8"],
    seed: 14,
    css: `.noir{--sel:#d6b47a;--bg:#0d0c0b;--fg:#f4efe7;--mut:#b8afa3;--card:#1a1816;--cardfg:#f4efe7;--line:#35302b;--btn:#f4efe7;--btnfg:#0d0c0b;--acc:#d6b47a;--ribfg:#0d0c0b;--disp:"Bodoni Moda",serif;--body:Figtree,sans-serif;--r:6px;--rb:6px;--hal:center}.noir .p-hero{position:relative;margin:0 -18px;height:560px}.noir .p-hero::after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(transparent,#0d0c0b)}.noir .p-head{padding-top:0;position:relative;z-index:1;margin-top:-90px}.noir .p-head h1{font-size:44px;font-style:italic;font-weight:400}.noir .p-seal{width:54px;margin:0 auto 8px}.noir .p-hero{overflow:hidden}`,
    header: (p) =>
        `<div class="p-hero">${picture(p)}</div><header class="p-head"><div class="p-seal">${p.art}</div>${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
