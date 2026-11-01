import { defineLook } from "../define-look";

export const comet = defineLook({
    label: "Comet",
    fonts: "family=Bungee&family=Rubik:wght@400;500;600",
    palette: ["#e5127b", "#e5127b", "#2c0d3f"],
    seed: 61,
    css: `.comet{--sel:#e5127b;--bg:#fff3df;--fg:#2c0d3f;--mut:#5f3a70;--card:#fff;--cardfg:#2c0d3f;--line:#2c0d3f;--btn:#e5127b;--btnfg:#fff;--acc:#e5127b;--disp:Bungee,sans-serif;--dw:400;--body:Rubik,sans-serif;--r:16px;--rb:16px;--line-b:2.5px solid #2c0d3f;--hal:center}.comet .p-burst{margin:0 -18px;padding:44px 18px 34px;text-align:center;background:repeating-conic-gradient(from 0deg at 50% 62%,#ff7a1a 0 10deg,#ffb000 10deg 20deg)}.comet .p-burst h1{margin:0;font:400 58px/.94 Bungee,sans-serif;color:#2c0d3f;text-shadow:3px 3px 0 #fff3df}.comet .p-burst .p-tag{display:inline-block;margin-top:14px;background:#2c0d3f;color:#fff3df;padding:6px 14px;border-radius:20px;font-weight:600;font-size:14.5px}.comet .b-head{font-size:24px}.comet .b-social{margin-top:18px}.comet .b-menu i{border-color:#2c0d3f}.comet .p-av{margin:0 0 12px}.comet .h-after{text-align:center}.comet .h-after .b-social{justify-content:center}`,
    header: (p) =>
        `<div class="p-burst">${p.avatar}${p.name}${p.tagline}</div><div class="h-after">${p.bio}${p.links}</div>`,
});
