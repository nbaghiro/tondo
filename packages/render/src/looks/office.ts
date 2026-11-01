import { defineLook } from "../define-look";

export const office = defineLook({
    label: "Office",
    fonts: "family=Fraunces:opsz,SOFT,wght@9..144,100,400;9..144,100,500;9..144,100,600&family=Hanken+Grotesk:wght@400;500;700",
    palette: ["#2f7a5b", "#8fbf9f", "#e0b04a", "#c9d6a8"],
    seed: 58,
    css: `.office{--sel:#2f7a5b;--bg:#f7f4ec;--fg:#23201a;--mut:#6a6455;--card:#fff;--cardfg:#23201a;--line:#d9d3c2;--btn:#23201a;--btnfg:#f7f4ec;--acc:#2f7a5b;--disp:Fraunces,serif;--dw:400;--body:"Hanken Grotesk",sans-serif;--r:12px;--rb:999px;--hal:left}.office .p-paint{width:300px;left:auto;right:-120px;margin:0;top:-150px;opacity:.8}.office .p-head{text-align:left;padding-top:96px}.office .p-head h1{font-size:46px;line-height:1;letter-spacing:-.02em}.office .p-head p{margin-left:0;font-size:17px}.office .b-social{justify-content:flex-start}`,
});
