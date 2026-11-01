import { defineLook } from "../define-look";

export const shelf = defineLook({
    label: "Shelf",
    fonts: "family=Mulish:wght@400;500;600;700&family=Rozha+One",
    palette: ["#b6841b", "#e7b23c", "#a0505a"],
    seed: 55,
    css: `.shelf{--sel:#b6841b;--bg:#6b1420;--fg:#fbead0;--mut:#e0bea0;--card:#fbead0;--cardfg:#4a0e17;--line:#a0505a;--btn:#e7b23c;--btnfg:#3d0a12;--acc:#b6841b;--disp:"Rozha One",serif;--dw:400;--body:Mulish,sans-serif;--r:4px;--rb:4px;--hal:center}.shelf .p-plate{margin:26px 14px 0;padding:22px 16px;border:2px solid #e7b23c;outline:1px solid #e7b23c;outline-offset:4px;text-align:center}.shelf .p-head{padding-top:0}.shelf .p-head h1{font-size:44px;line-height:1.03}.shelf .b-ev{--line:#a0505a}.shelf .b-date small{color:#e7b23c}.shelf .b-chip{background:#e7b23c;color:#3d0a12!important}.shelf .b-posts small{color:#e0bea0}.shelf .b-posts span{color:#e0bea0}`,
    header: (p) =>
        `<div class="p-plate"><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header></div>`,
});
