import { defineLook, picture } from "../define-look";

export const calm = defineLook({
    label: "Calm",
    fonts: "family=Figtree:wght@400;500;600;700&family=Lora:wght@400;500",
    palette: ["#2f5243", "#2f5243", "#bccabb"],
    seed: 58,
    css: `.calm{--sel:#2f5243;--bg:#dfe7dd;--fg:#22352c;--mut:#54665b;--card:#eef2ea;--cardfg:#22352c;--line:#bccabb;--btn:#2f5243;--btnfg:#fff;--acc:#2f5243;--disp:Lora,serif;--dw:500;--body:Figtree,sans-serif;--r:16px;--hal:left}.calm .p-head{text-align:left;padding-top:34px}.calm .p-head h1{font-size:33px;line-height:1.18;font-weight:400}.calm .p-head h1+.p-tag{margin-top:14px}.calm .b-social{justify-content:flex-start}.calm .p-sideimg{height:236px;margin:26px -18px 0 0;border-radius:120px 0 0 120px;overflow:hidden}`,
    header: (p) =>
        `<header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header><div class="p-sideimg">${picture(p)}</div>`,
});
