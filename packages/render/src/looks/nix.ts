import { defineLook } from "../define-look";

export const nix = defineLook({
    label: "Lacquer",
    fonts: "family=Nunito:wght@400;600;700&family=Playfair+Display:ital,wght@1,700",
    palette: ["#c9182f", "#c9182f", "#f0d6d0"],
    seed: 40,
    css: `.nix{--sel:#c9182f;--bg:#fff7f4;--fg:#3a0d16;--mut:#7a4a52;--card:#fff;--cardfg:#3a0d16;--line:#f0d6d0;--btn:#c9182f;--btnfg:#fff;--acc:#c9182f;--disp:"Playfair Display",serif;--dw:700;--body:Nunito,sans-serif;--r:16px;--hal:center}.nix .p-nails{display:flex;align-items:flex-start;justify-content:center;gap:9px;margin:0 -18px;height:164px;overflow:hidden}.nix .p-nails i{flex:0 0 46px;height:150px;border-radius:0 0 26px 26px/0 0 44px 44px;box-shadow:inset -6px -8px 10px rgba(255,255,255,.28),inset 5px 0 8px rgba(0,0,0,.08)}.nix .p-nails i:nth-child(odd){height:128px}.nix .p-head{padding-top:18px}.nix .p-head h1{font-size:48px;font-style:italic;line-height:1}.nix .b-head{font-size:24px;font-style:italic}`,
    header: (p) =>
        `<div class="p-nails" aria-hidden="true"><i style="background:#c9182f"></i><i style="background:#f26a4b"></i><i style="background:#f6b6ad"></i><i style="background:#7a0e22"></i><i style="background:#e8467c"></i><i style="background:#f9d3c5"></i><i style="background:#c9182f"></i></div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
