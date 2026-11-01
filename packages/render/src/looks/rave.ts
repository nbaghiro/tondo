import { defineLook, picture } from "../define-look";

export const rave = defineLook({
    label: "Rave",
    fonts: "family=Rethink+Sans:wght@400;500;600;700&family=Unbounded:wght@700",
    palette: ["#ff4fd8", "#ff4fd8"],
    seed: 15,
    css: `.rave{--sel:#ff4fd8;--bg:#14052e;--fg:#f8f1ff;--mut:#bfaedd;--card:rgba(255,255,255,.09);--cardfg:#f8f1ff;--line:rgba(255,255,255,.22);--btn:#ff4fd8;--btnfg:#14052e;--acc:#ff4fd8;--ribfg:#14052e;--pl:#2a0f5c;--plfg:#fff;--disp:Unbounded,sans-serif;--dw:700;--body:"Rethink Sans",sans-serif;--r:22px}.rave .p-head{padding-top:0;margin-top:-58px;position:relative}.rave .p-head h1{font-size:44px;letter-spacing:-.03em}.rave .b-head{font-size:19px}.rave .b-count b{font-size:74px;color:#ff4fd8}`,
    header: (p) =>
        `<div class="p-full">${picture(p)}</div><header class="p-head">${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
