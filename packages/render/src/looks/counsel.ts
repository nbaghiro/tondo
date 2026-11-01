import { defineLook } from "../define-look";

export const counsel = defineLook({
    label: "Letterhead",
    fonts: "family=Libre+Baskerville:wght@400;700",
    palette: ["#21493b", "#21493b", "#cfd0c6"],
    seed: 46,
    css: `.counsel{--sel:#21493b;--bg:#f8f6f0;--fg:#1a2a24;--mut:#55625c;--card:#fff;--cardfg:#1a2a24;--line:#cfd0c6;--btn:#21493b;--btnfg:#fff;--acc:#21493b;--disp:"Libre Baskerville",serif;--dw:400;--body:"Libre Baskerville",serif;--r:0px;--rb:0px;font-size:15px;--hal:left}.counsel .p-letter{padding-top:44px}.counsel .p-letter .p-tag{display:block;font-size:12.5px;letter-spacing:.08em;color:#55625c;padding-bottom:12px;border-bottom:1px solid #1a2a24}.counsel .p-letter h1{font-size:34px;line-height:1.14;font-weight:400;margin:26px 0 12px}.counsel .p-letter p{margin:0;line-height:1.65;font-size:15px}.counsel .p-letter em{display:block;margin-top:16px;font-size:14px}.counsel .b-head{font-size:18px;border-bottom:1px solid #1a2a24;padding-bottom:7px}.counsel .b-social{justify-content:flex-start}.counsel .b-faq details{padding:14px 0}.counsel .b-line small{font-size:12.5px}.counsel .p-av{margin:0 0 12px}.counsel .p-letter .p-tag{margin:0}`,
    header: (p) =>
        `<header class="p-letter">${p.tagline}${p.avatar}${p.name}${p.bio}</header><div class="h-after">${p.links}</div>`,
});
