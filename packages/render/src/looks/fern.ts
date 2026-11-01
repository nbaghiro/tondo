import { defineLook, picture } from "../define-look";

export const fern = defineLook({
    label: "Fern",
    fonts: "family=Figtree:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400",
    palette: ["#d7e88a", "#d7e88a", "#3f6a58"],
    seed: 12,
    css: `.fern{--sel:#d7e88a;--bg:#163a2c;--fg:#eef3df;--mut:#b7c8ad;--card:#20493a;--cardfg:#eef3df;--line:#3f6a58;--btn:#d7e88a;--btnfg:#163a2c;--acc:#d7e88a;--ribfg:#163a2c;--disp:Newsreader,serif;--dw:400;--body:Figtree,sans-serif;--r:14px;--line-b:0}.fern .p-head{text-align:left;padding-top:0}.fern .p-head h1{font-size:52px;font-style:italic;letter-spacing:-.02em;margin-top:18px}.fern .p-head p{margin-left:0}.fern .b-social{justify-content:flex-start}.fern .p-arch2{margin:30px -18px 0 26%;height:280px;border-radius:200px 0 0 200px;overflow:hidden}`,
    header: (p) =>
        `<div class="p-arch2">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
