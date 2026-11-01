import { defineLook } from "../define-look";

export const keys = defineLook({
    label: "Keys",
    fonts: "family=EB+Garamond:ital,wght@0,500;1,500&family=Figtree:wght@400;500;600;700",
    palette: ["#d8b26a", "#d8b26a", "#36434f"],
    seed: 29,
    css: `.keys{--sel:#d8b26a;--bg:#101820;--fg:#f5efe2;--mut:#b4b0a4;--card:#1a2530;--cardfg:#f5efe2;--line:#36434f;--btn:#d8b26a;--btnfg:#101820;--acc:#d8b26a;--ribfg:#101820;--disp:"EB Garamond",serif;--dw:500;--body:Figtree,sans-serif;--r:6px;--rb:6px;--hal:center}.keys .p-keyboard{margin:0 -18px;height:150px;background:linear-gradient(90deg,#f5efe2 0 calc(100% - 1px),#888 0) 0 0/56px 100%;position:relative;box-shadow:inset 0 -9px 12px rgba(0,0,0,.2)}.keys .p-keyboard i{position:absolute;top:0;width:34px;height:92px;background:#101820;border-radius:0 0 4px 4px}.keys .p-head{padding-top:30px}.keys .p-head h1{font-size:50px;font-style:italic;line-height:1.02}.keys .b-head{font-size:27px;font-style:italic}.keys .b-tiers .on{border-color:#d8b26a}`,
    header: (p) =>
        `<div class="p-keyboard" aria-hidden="true"><i style="left:38px"></i><i style="left:94px"></i><i style="left:206px"></i><i style="left:262px"></i><i style="left:318px"></i></div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
