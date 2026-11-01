import { defineLook } from "../define-look";

export const conf = defineLook({
    label: "Ticket",
    fonts: "family=Space+Grotesk:wght@400;500;700",
    palette: ["#ff5a1f", "#160a05", "#160a05"],
    seed: 7,
    css: `.conf{--sel:#ff5a1f;--bg:#ff5a1f;--fg:#160a05;--mut:#3e1a0a;--card:#fff5ec;--cardfg:#160a05;--line:#160a05;--btn:#160a05;--btnfg:#fff5ec;--acc:#ff5a1f;--ribfg:#160a05;--disp:"Space Grotesk",sans-serif;--dw:700;--body:"Space Grotesk",sans-serif;--r:14px;--rb:10px}.conf .p-tick{margin-top:24px;background:#fff5ec;border-radius:18px;padding:20px;position:relative;--mut:#6b4f40}.conf .p-tick::before{content:"";position:absolute;width:26px;height:26px;border-radius:50%;background:#ff5a1f;bottom:78px}.conf .p-tick::after{content:"";position:absolute;width:26px;height:26px;border-radius:50%;background:#ff5a1f;bottom:78px}.conf .p-tick::before{left:-13px}.conf .p-tick::after{right:-13px}.conf .p-tick h1{font-size:50px;line-height:.96;letter-spacing:-.04em;margin:0}.conf .p-meta{display:flex;justify-content:space-between;gap:12px;margin-top:40px;padding-top:14px;border-top:2px dashed #160a05;font-weight:500;font-size:14.5px}.conf .b-countline{background:#160a05;color:#fff5ec}.conf .b-rib{background:#160a05;color:#fff5ec}.conf .b-tabs{--line:#160a05;--mut:#3e1a0a}.conf .b-sched{--line:#160a05;--mut:#3e1a0a}.conf .b-tabbar label{border-color:#160a05}.conf .b-chip{background:#160a05;color:#fff5ec!important}.conf .b-head{font-size:27px;letter-spacing:-.02em}.conf .b-people{--mut:#3e1a0a}.conf .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<div class="p-tick">${p.avatar}${p.name}<div class="p-meta">${p.tagline}</div></div><div class="h-after">${p.bio}${p.links}</div>`,
});
