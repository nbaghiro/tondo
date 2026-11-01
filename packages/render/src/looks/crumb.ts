import { defineLook, picture } from "../define-look";

export const crumb = defineLook({
    label: "Crumb",
    fonts: "family=Figtree:wght@400;500;600;700&family=Gelasio:wght@700",
    palette: ["#b5651d", "#8a4a1c", "#e5d3b8"],
    seed: 62,
    css: `.crumb{--sel:#b5651d;--bg:#fbf4e7;--fg:#3d2412;--mut:#6d5340;--card:#fffdf7;--cardfg:#3d2412;--line:#e5d3b8;--btn:#8a4a1c;--btnfg:#fff;--acc:#b5651d;--disp:Gelasio,serif;--dw:700;--body:Figtree,sans-serif;--r:12px;--rb:12px}.crumb .p-split{margin:0 -18px;position:relative;height:430px;background:#8a4a1c}.crumb .p-split img{position:absolute;inset:0;clip-path:polygon(0 0,100% 0,100% 62%,0 82%)}.crumb .p-split div{position:absolute;left:18px;right:18px;bottom:20px;color:#fbf4e7}.crumb .p-split h1{margin:0;font:700 45px/1 Gelasio,serif}.crumb .p-split .p-tag{display:block;font-size:14.5px;margin-top:6px}.crumb .b-head{font-size:24px}.crumb .b-social{margin-top:18px}.crumb .p-split{overflow:hidden}.crumb .p-split .p-tag{color:#fff}`,
    header: (p) =>
        `<div class="p-split">${picture(p)}<div>${p.name}${p.tagline}</div></div><div class="h-after">${p.bio}${p.links}</div>`,
});
