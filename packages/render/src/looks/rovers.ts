import { defineLook } from "../define-look";

export const rovers = defineLook({
    label: "Rovers",
    fonts: "family=Barlow:wght@400;500;700&family=Graduate",
    palette: ["#7a1433", "#7a1433", "#d4dde6"],
    seed: 18,
    css: `.rovers{--sel:#7a1433;--bg:#f2f6fa;--fg:#4a0e22;--mut:#6b4553;--card:#fff;--cardfg:#4a0e22;--line:#d4dde6;--btn:#7a1433;--btnfg:#fff;--acc:#7a1433;--disp:Graduate,serif;--dw:400;--body:Barlow,sans-serif;--r:6px;--rb:6px;--hal:center}.rovers .p-kit{margin:0 -18px;height:236px;background:repeating-linear-gradient(90deg,#7a1433 0 48px,#8fc6ea 48px 96px);display:grid;place-items:end center}.rovers .p-crest{width:136px;height:164px;margin-bottom:-58px;position:relative;background:#fff;clip-path:polygon(0 0,100% 0,100% 62%,50% 100%,0 62%);display:grid;place-items:center;padding-bottom:30px;text-align:center;font:400 20px/1.02 Graduate,serif;color:#7a1433}.rovers .p-crest::before{content:"";position:absolute;inset:6px;background:#8fc6ea;clip-path:polygon(0 0,100% 0,100% 62%,50% 100%,0 62%);z-index:-1}.rovers .p-head{padding-top:72px}.rovers .p-head h1{font-size:30px;line-height:1.1}.rovers .b-head{font-size:21px}`,
    header: (p) =>
        `<div class="p-kit" aria-hidden="true"><div class="p-crest">${p.initials}</div></div><header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
