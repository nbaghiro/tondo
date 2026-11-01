import { defineLook, picture } from "../define-look";

export const scrap = defineLook({
    label: "Scrapbook",
    fonts: "family=Caveat:wght@700&family=Karla:wght@400;500;700",
    palette: ["#e8644a", "#2d2a32", "#e0d9cc"],
    seed: 62,
    css: `.scrap{--sel:#e8644a;--bg:#fbf8f1;--fg:#2d2a32;--mut:#625d68;--card:#fff;--cardfg:#2d2a32;--line:#e0d9cc;--btn:#2d2a32;--btnfg:#fff;--acc:#e8644a;--disp:Caveat,cursive;--dw:700;--body:Karla,sans-serif;--r:6px;--rb:8px}.scrap .page{background-image:radial-gradient(#ddd5c6 1.2px,transparent 1.2px);background-size:22px 22px}.scrap .p-pol{display:flex;justify-content:center;margin:34px -6px 0;height:220px}.scrap .p-pol div{position:relative;flex:0 0 132px;height:168px;padding:8px 8px 30px;background:#fff;box-shadow:0 8px 18px rgba(45,42,50,.2);margin:0 -13px}.scrap .p-pol div:nth-child(1){transform:rotate(-7deg)}.scrap .p-pol div:nth-child(2){transform:rotate(4deg) translateY(22px);z-index:1}.scrap .p-pol div:nth-child(3){transform:rotate(9deg) translateY(2px)}.scrap .p-pol div::before{content:"";position:absolute;z-index:1;top:-8px;left:30%;width:40%;height:18px;background:rgba(232,100,74,.55);transform:rotate(-3deg)}.scrap .p-pol small{position:absolute;left:0;right:0;bottom:5px;text-align:center;font:700 17px Caveat,cursive}.scrap .p-head{padding-top:26px}.scrap .p-head h1{font-size:56px;line-height:.95}.scrap .b-head{font-size:32px}`,
    header: (p) =>
        `<div class="p-pol"><div>${picture(p)}</div></div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
