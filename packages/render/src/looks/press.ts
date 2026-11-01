import { defineLook } from "../define-look";

export const press = defineLook({
    label: "Press",
    fonts: "family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400",
    palette: ["#c1272d", "#c1272d", "#1c1a16"],
    seed: 22,
    css: `.press{--sel:#c1272d;--bg:#f6f1e4;--fg:#1c1a16;--mut:#615b4e;--card:transparent;--cardfg:#1c1a16;--line:#1c1a16;--btn:#c1272d;--btnfg:#fff;--acc:#c1272d;--disp:Newsreader,serif;--dw:600;--body:Newsreader,serif;--r:0px;--rb:0px;--hal:left}.press .p-head{padding-top:26px;border-bottom:3px double #1c1a16;padding-bottom:12px}.press .p-head h1{font-size:60px;line-height:.95;letter-spacing:-.03em}.press .b-posts b{font-size:22px}.press .b-count{border-width:1px 0}.press .b-form{border-width:0 0 1px;padding:14px 0;border-radius:0}.press .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
