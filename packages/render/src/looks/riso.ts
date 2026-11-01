import { defineLook, picture } from "../define-look";

export const riso = defineLook({
    label: "Riso",
    fonts: "family=Archivo:wght@400;500;700&family=Bowlby+One",
    palette: ["#f0324b", "#f0324b", "#1d2bb8"],
    seed: 30,
    css: `.riso{--sel:#f0324b;--bg:#f3ecdc;--fg:#1d2bb8;--mut:#3a46b8;--card:#f3ecdc;--cardfg:#1d2bb8;--line:#1d2bb8;--btn:#f0324b;--btnfg:#fff;--acc:#f0324b;--disp:"Bowlby One",sans-serif;--dw:400;--body:Archivo,sans-serif;--r:0px;--rb:0px;--line-b:2px solid #1d2bb8}.riso .p-duo{margin:0 -18px;height:400px;background:#f0324b;position:relative;overflow:hidden}.riso .p-duo img{filter:grayscale(1) contrast(1.35);mix-blend-mode:multiply}.riso .p-duo{height:320px}.riso .p-head{text-align:left;padding-top:18px}.riso .p-head h1{font-size:62px;line-height:.92;color:#1d2bb8}.riso .p-head p{margin:12px 0 0;color:#1d2bb8;font-weight:500}.riso .b-social{justify-content:flex-start}.riso .b-head{font-size:27px}.riso .b-prod{border-radius:0}.riso .b-pi{border-radius:0}.riso .b-pi img{filter:grayscale(1) contrast(1.15)}.riso .b-chip{border-radius:0}`,
    header: (p) =>
        `<div class="p-duo">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
