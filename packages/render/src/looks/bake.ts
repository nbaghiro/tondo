import { defineLook } from "../define-look";

export const bake = defineLook({
    label: "Bakehouse",
    fonts: "family=Caprasimo&family=Rethink+Sans:wght@400;500;600;700",
    palette: ["#f4a03c", "#e0672f", "#f2c46b", "#f7dc9b"],
    seed: 40,
    css: `.bake{--sel:#c8362b;--bg:#fff7ec;--fg:#6a1a12;--mut:#7d4238;--card:#fff;--cardfg:#6a1a12;--line:#efc9b8;--btn:#c8362b;--btnfg:#fff;--acc:#c8362b;--disp:Caprasimo,serif;--dw:400;--body:"Rethink Sans",sans-serif;--r:24px;--line-b:2px solid #6a1a12;--hal:center}.bake .page{background:repeating-linear-gradient(0deg,rgba(200,54,43,.09) 0 22px,transparent 22px 44px),repeating-linear-gradient(90deg,rgba(200,54,43,.09) 0 22px,transparent 22px 44px),#fff7ec}.bake .p-logo{width:128px;height:128px;margin:0 auto 12px;border-radius:50%;background:#c8362b;color:#fff7ec;display:grid;place-items:center;text-align:center;font:400 25px/.95 Caprasimo,serif;border:4px solid #fff7ec;outline:2px solid #6a1a12}.bake .p-head h1{font-size:27px}.bake .p-head p{color:#6a1a12}.bake .p-tag{color:#6a1a12}.bake .b-head{background:#fff7ec;display:table;margin:26px auto 2px;padding:2px 14px;border-radius:12px;font-size:23px}.bake .p-paint{opacity:.6;top:-280px}.bake .p-logo h1{font:inherit;color:inherit;overflow-wrap:anywhere;padding:0 10px;margin:0}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><header class="p-head"><div class="p-logo">${p.name}</div>${p.avatar}${p.tagline}${p.bio}${p.links}</header>`,
});
