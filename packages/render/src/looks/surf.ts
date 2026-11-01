import { defineLook } from "../define-look";

const WAVE = `<svg viewBox="0 0 390 90" aria-hidden="true"><path d="M0 40c32-26 65-26 97 0s65 26 98 0 65-26 97 0 66 26 98 0v50H0z" fill="#fff1d6"/></svg>`;

export const surf = defineLook({
    label: "Surf",
    fonts: "family=Shrikhand&family=Rethink+Sans:wght@400;500;600;700",
    palette: ["#17a3a8", "#f9b233", "#f2803a", "#e4572e"],
    seed: 31,
    css: `.surf{--bg:#fff1d6;--fg:#20323f;--mut:#566672;--card:#fffaf0;--cardfg:#20323f;--line:#20323f;--btn:#e4572e;--btnfg:#fff;--acc:#e4572e;--disp:Shrikhand,serif;--dw:400;--body:"Rethink Sans",sans-serif;--r:18px;--line-b:2px solid #20323f;--sh:4px 4px 0 #20323f;--hal:center;--sel:#e4572e}.surf .h-own .p-sun{height:262px;margin:0 -18px;position:relative;overflow:hidden;background:#17a3a8}.surf .h-own .p-sun::before{content:"";position:absolute;left:50%;top:32px;width:290px;height:290px;margin-left:-145px;border-radius:50%;background:repeating-linear-gradient(#f9b233 0 26px,#f2803a 26px 42px,#e4572e 42px 54px)}.surf .h-own .p-sun svg{position:absolute;left:0;right:0;bottom:-1px;width:100%}.surf .h-own .p-head{padding-top:6px}.surf .h-own .p-head h1{font-size:48px;line-height:1;color:#e4572e}.surf .h-own .p-tag{font-weight:600}.surf .b-btn{box-shadow:none}`,
    header: (p) =>
        `<div class="p-sun">${WAVE}</div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
