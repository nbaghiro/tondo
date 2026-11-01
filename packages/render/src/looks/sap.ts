import { defineLook, picture } from "../define-look";

export const sap = defineLook({
    label: "Sap",
    fonts: "family=Figtree:wght@400;500;600;700&family=Gloock",
    palette: ["#4d7a2a", "#8aa83a", "#1f5c4a", "#d3a63a"],
    seed: 15,
    css: `.sap{--sel:#4d7a2a;--bg:#eef2e3;--fg:#17331f;--mut:#4a5f4d;--card:#fbfcf4;--cardfg:#17331f;--line:#c9d6b4;--btn:#17331f;--btnfg:#f4f7e8;--acc:#4d7a2a;--disp:Gloock,serif;--dw:400;--body:Figtree,sans-serif;--r:22px;--line-b:2px solid #17331f}.sap .p-arch{height:320px;margin:30px auto 0;width:86%;border-radius:200px 200px 16px 16px;overflow:hidden;border:2px solid #17331f}.sap .p-head{padding-top:18px}.sap .b-prod{border-radius:120px 120px 16px 16px;text-align:center}.sap .b-pi{border-radius:120px 120px 10px 10px}.sap .p-paint{top:-170px}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><div class="p-arch">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
