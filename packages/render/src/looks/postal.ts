import { defineLook } from "../define-look";

export const postal = defineLook({
    label: "Postal",
    fonts: "family=Courgette&family=Nunito:wght@400;600;700",
    palette: ["#c94f2c", "#c94f2c", "#d6c7ac"],
    seed: 64,
    css: `.postal{--sel:#c94f2c;--bg:#f4ead9;--fg:#2b3a42;--mut:#5d6a70;--card:#fffaf0;--cardfg:#2b3a42;--line:#d6c7ac;--btn:#c94f2c;--btnfg:#fff;--acc:#c94f2c;--disp:Courgette,cursive;--dw:400;--body:Nunito,sans-serif;--r:6px;--rb:6px}.postal .p-card{position:relative;margin:30px 2px 0;padding:20px 16px 18px;background:#fffaf0;transform:rotate(-1.6deg);box-shadow:0 10px 22px rgba(43,58,66,.2);border-top:8px solid transparent;border-image:repeating-linear-gradient(90deg,#c94f2c 0 16px,#fffaf0 16px 24px,#21707b 24px 40px,#fffaf0 40px 48px) 8}.postal .p-stamp{position:absolute;right:12px;top:12px;width:72px;height:88px;border:4px dotted #fffaf0;outline:1px solid #d6c7ac;overflow:hidden;background:#21707b;color:#fffaf0;display:grid;place-items:center;font:400 21px/1 Courgette,cursive;text-align:center}.postal .p-card h1{margin:0;font:400 46px/1 Courgette,cursive;color:#c94f2c;max-width:6em}.postal .p-card p{margin:50px 0 0;line-height:1.5}.postal .p-card .p-tag{display:block;margin-top:12px;color:#5d6a70;font-size:13.5px}.postal .b-social{margin-top:22px}.postal .b-head{font-size:24px;color:#21707b}.postal .p-av{margin:0 0 12px}.postal .p-card h1{padding-right:66px}`,
    header: (p) =>
        `<header class="p-card"><div class="p-stamp">${p.initials}</div>${p.avatar}${p.name}${p.bio}${p.tagline}</header><div class="h-after">${p.links}</div>`,
});
