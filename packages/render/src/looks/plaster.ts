import { defineLook, picture } from "../define-look";

export const plaster = defineLook({
    label: "Plaster",
    fonts: "family=Cormorant+Garamond:ital,wght@0,400;0,500;1,500&family=Karla:wght@400;500;700",
    palette: ["#8a5a3c", "#8a5a3c", "#cfc7b8"],
    seed: 48,
    css: `.plaster{--sel:#8a5a3c;--bg:#e9e3d9;--fg:#2e2a25;--mut:#6c655b;--card:#f3efe7;--cardfg:#2e2a25;--line:#cfc7b8;--btn:#8a5a3c;--btnfg:#fff;--acc:#8a5a3c;--disp:"Cormorant Garamond",serif;--dw:400;--body:Karla,sans-serif;--r:0px;--rb:0px;--hal:left}.plaster .p-head{padding-top:0;text-align:left;margin-top:16px}.plaster .p-head h1{font-size:44px;line-height:1}.plaster .p-head p{margin-left:0}.plaster .b-social{justify-content:flex-start}.plaster .b-head{font-size:27px}.plaster .p-archw{margin:0 -18px;height:340px;border-radius:0 0 50% 50%/0 0 18% 18%;overflow:hidden}`,
    header: (p) =>
        `<div class="p-archw">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
