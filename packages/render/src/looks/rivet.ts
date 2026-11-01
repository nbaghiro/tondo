import { defineLook } from "../define-look";

export const rivet = defineLook({
    label: "Rivet",
    fonts: "family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@700",
    palette: ["#d94f04", "#1d2326", "#c4c9c9"],
    seed: 19,
    css: `.rivet{--sel:#d94f04;--bg:#e9ebea;--fg:#1d2326;--mut:#535b5f;--card:#fff;--cardfg:#1d2326;--line:#c4c9c9;--btn:#1d2326;--btnfg:#fff;--acc:#d94f04;--disp:"Barlow Condensed",sans-serif;--dw:700;--body:Barlow,sans-serif;--r:3px;--rb:3px;--hal:left}.rivet .p-tape{margin:0 -18px;height:26px;background:repeating-linear-gradient(-45deg,#ff8a00 0 22px,#1d2326 22px 44px)}.rivet .p-head{text-align:left;padding-top:24px}.rivet .p-head h1{font-size:62px;line-height:.92;font-weight:700;letter-spacing:-.005em}.rivet .p-head p{margin-left:0;color:#1d2326}.rivet .b-social{justify-content:flex-start}.rivet .b-head{font-size:28px}.rivet .b-svc .b-chip{background:#d94f04;color:#fff!important}.rivet .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<div class="p-tape" aria-hidden="true"></div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
