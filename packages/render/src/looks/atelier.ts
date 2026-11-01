import { defineLook } from "../define-look";

export const atelier = defineLook({
    label: "Atelier",
    fonts: "family=Hanken+Grotesk:wght@400;500;700&family=Italiana",
    palette: ["#8a2846", "#3a1320", "#caa79f"],
    seed: 27,
    css: `.atelier{--sel:#8a2846;--bg:#efd9d2;--fg:#3a1320;--mut:#6d4250;--card:#f8ece7;--cardfg:#3a1320;--line:#caa79f;--btn:#3a1320;--btnfg:#f8ece7;--acc:#8a2846;--disp:Italiana,serif;--dw:400;--body:"Hanken Grotesk",sans-serif;--r:0px;--rb:999px;--hal:center}.atelier .p-head h1{font-size:52px;line-height:1}.atelier .p-head{padding-top:30px}.atelier .b-head{font-size:30px}.atelier .b-ft b{font-size:26px}.atelier .b-fi{height:420px}.atelier .b-car img{height:280px;background:#fff}.atelier .b-fi img{object-position:50% 20%}.atelier .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
