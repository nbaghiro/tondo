import { defineLook, picture } from "../define-look";

export const estate = defineLook({
    label: "Estate",
    fonts: "family=Figtree:wght@400;500;600;700&family=Libre+Caslon+Display",
    palette: ["#b98a3a", "#c9a35b", "#5c6880"],
    seed: 51,
    css: `.estate{--sel:#b98a3a;--bg:#101c33;--fg:#f4eee1;--mut:#b3b4b5;--card:#f4eee1;--cardfg:#101c33;--line:#5c6880;--btn:#c9a35b;--btnfg:#101c33;--acc:#b98a3a;--disp:"Libre Caslon Display",serif;--dw:400;--body:Figtree,sans-serif;--r:3px;--rb:3px;--hal:center}.estate .b-stats b{color:#c9a35b}.estate .b-svc{--line:#d9cfb9}.estate .b-contact{--line:#d9cfb9}.estate .p-head{padding-top:18px}.estate .p-head h1{font-size:38px}.estate .p-seal2{width:62px;height:62px;font-size:24px;border-radius:2px;border:1px solid #c9a35b;background:transparent;color:#c9a35b}.estate .b-chip{background:#101c33;color:#f4eee1!important}`,
    header: (p) =>
        `<div class="p-banner">${picture(p)}</div><header class="p-head"><div class="p-seal2">${p.initials}</div>${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
