import { defineLook } from "../define-look";

export const smile = defineLook({
    label: "Smile",
    fonts: "family=Sora:wght@400;600",
    palette: ["#0d7f77", "#0d7f77", "#c4e7df"],
    seed: 63,
    css: `.smile{--sel:#0d7f77;--bg:#f1fbf8;--fg:#0d3b3a;--mut:#3b6160;--card:#fff;--cardfg:#0d3b3a;--line:#c4e7df;--btn:#0d7f77;--btnfg:#fff;--acc:#0d7f77;--disp:Sora,sans-serif;--dw:600;--body:Sora,sans-serif;--r:18px}.smile .p-arc{margin:0 -18px;height:272px;position:relative;overflow:hidden;background:#8fe3d2}.smile .p-arc::after{content:"";position:absolute;left:-16%;right:-16%;bottom:-150px;height:300px;border-radius:50%;background:#f1fbf8}.smile .p-arc div{position:relative;z-index:1;padding:44px 24px 0;text-align:center}.smile .p-arc h1{margin:0;font:600 34px/1.08 Sora,sans-serif;letter-spacing:-.03em;color:#0d3b3a}.smile .p-arc p{margin:10px 0 0;font-size:14.5px;color:#0d3b3a}.smile .b-social{margin:-18px 0 8px;position:relative;z-index:1}.smile .b-head{font-size:19px}.smile .b-faq p{font-size:13.5px}.smile .b-svc small{font-size:13.5px}.smile .h-after .b-social{justify-content:center;margin-top:14px}.smile .h-after{text-align:center;position:relative}.smile .h-after p{margin:14px auto 0}`,
    header: (p) =>
        `<div class="p-arc"><div>${p.avatar}${p.name}${p.tagline}</div></div><div class="h-after">${p.bio}${p.links}</div>`,
});
