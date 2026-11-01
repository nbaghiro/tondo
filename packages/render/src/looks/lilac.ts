import { defineLook, picture } from "../define-look";

export const lilac = defineLook({
    label: "Lilac",
    fonts: "family=Gilda+Display&family=Karla:wght@400;500;700",
    palette: ["#b69cf0", "#e7a9d8", "#8fa2f2", "#f5c7c7"],
    seed: 45,
    css: `.lilac{--sel:#7b5fc7;--bg:#ece6f6;--fg:#2c2350;--mut:#5f5684;--card:#f8f5fd;--cardfg:#2c2350;--line:#cfc5e6;--btn:#4a3b8f;--btnfg:#fff;--acc:#7b5fc7;--disp:"Gilda Display",serif;--dw:400;--body:Karla,sans-serif;--r:30px;--hal:center}.lilac .p-paint{width:600px;margin-left:-300px;top:-330px;opacity:.7}.lilac .p-head{padding-top:62px}.lilac .p-head h1{font-size:50px;line-height:1.03}.lilac .p-oval{width:210px;height:290px;margin:26px auto 0;border-radius:50%;overflow:hidden;border:5px solid #f8f5fd}.lilac .b-sched{text-align:left}.lilac .b-tabbar{text-align:left}`,
    header: (p) =>
        `<div class="p-paint">${p.art}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header><div class="p-oval">${picture(p)}</div>`,
});
