import { defineLook } from "../define-look";

export const pixel = defineLook({
    label: "Pixel",
    fonts: "family=Press+Start+2P&family=Rubik:wght@400;500;600",
    palette: ["#3dffb5", "#3dffb5", "#2e3a66"],
    seed: 11,
    css: `.pixel{--sel:#3dffb5;--bg:#0a0f1e;--fg:#e8fbff;--mut:#9cc1cc;--card:#141b33;--cardfg:#e8fbff;--line:#2e3a66;--btn:#3dffb5;--btnfg:#0a0f1e;--acc:#3dffb5;--ribfg:#0a0f1e;--disp:"Press Start 2P",monospace;--dw:400;--body:Rubik,sans-serif;--r:0px;--rb:0px;--line-b:2px solid #2e3a66;--hal:left}.pixel .p-crt{margin:22px 0 0;padding:22px 14px;background:#0f1a3a;border:4px solid #3dffb5;box-shadow:6px 6px 0 #ff4f9a;text-align:left}.pixel .p-crt .p-tag{display:inline-block;background:#ff4f9a;color:#0a0f1e;font:400 10px "Press Start 2P",monospace;padding:6px 8px}.pixel .p-crt h1{margin:18px 0 12px;font:400 30px/1.2 "Press Start 2P",monospace;color:#3dffb5;overflow-wrap:anywhere}.pixel .p-crt p{margin:0;font-size:15px}.pixel .b-social{justify-content:flex-start;margin-top:18px}.pixel .b-head{font-size:15px;line-height:1.5;margin-top:32px}.pixel .b-stats b{font-size:15px;line-height:1.4}.pixel .b-tiers strong{font-size:20px}.pixel .b-sched time{font-size:13.5px}.pixel .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<header class="p-crt">${p.tagline}${p.avatar}${p.name}${p.bio}</header><div class="h-after">${p.links}</div>`,
});
