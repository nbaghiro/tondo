import { defineLook, picture } from "../define-look";

export const brine = defineLook({
    label: "Brine",
    fonts: "family=Karla:wght@400;500;700&family=Marcellus",
    palette: ["#2f7f8f", "#1d3640", "#b7c9cd"],
    seed: 53,
    css: `.brine{--sel:#2f7f8f;--bg:#dfe8ea;--fg:#1d3640;--mut:#50676f;--card:#f6f9f9;--cardfg:#1d3640;--line:#b7c9cd;--btn:#1d3640;--btnfg:#f6f9f9;--acc:#2f7f8f;--disp:Marcellus,serif;--dw:400;--body:Karla,sans-serif;--r:2px;--rb:2px;--hal:center}.brine .p-window{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:170px 170px;gap:7px;margin:26px 16px 0;padding:7px;background:#f6f9f9;box-shadow:0 10px 24px rgba(29,54,64,.18)}.brine .p-window div{overflow:hidden}.brine .p-window div img{width:200%;height:200%;max-width:none}.brine .p-window div:nth-child(1) img{object-position:0 0}.brine .p-window div:nth-child(2) img{margin-left:-100%}.brine .p-window div:nth-child(3) img{margin-top:-100%}.brine .p-window div:nth-child(4) img{margin:-100% 0 0 -100%}.brine .p-head{padding-top:22px}.brine .p-head h1{font-size:38px}.brine .b-head{font-size:24px}`,
    header: (p) =>
        `<div class="p-window"><div>${picture(p)}</div><div>${picture(p)}</div><div>${picture(p)}</div><div>${picture(p)}</div></div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
