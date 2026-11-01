import { defineLook, picture } from "../define-look";

export const wax = defineLook({
    label: "Wax",
    fonts: "family=Cormorant+SC:wght@500&family=Mulish:wght@400;500;600;700",
    palette: ["#e7b768", "#e7b768", "#47382a"],
    seed: 41,
    css: `.wax{--sel:#e7b768;--bg:#14100b;--fg:#f4e6cf;--mut:#bda98b;--card:#221a11;--cardfg:#f4e6cf;--line:#47382a;--btn:#e7b768;--btnfg:#14100b;--acc:#e7b768;--ribfg:#14100b;--disp:"Cormorant SC",serif;--dw:500;--body:Mulish,sans-serif;--r:4px;--rb:2px;--hal:center}.wax .p-glow{margin:0 -18px;height:370px;position:relative;overflow:hidden}.wax .p-glow img{object-position:50% 32%}.wax .p-glow::after{content:"";position:absolute;inset:55% 0 0;background:linear-gradient(transparent,#14100b)}.wax .p-label{position:relative;z-index:1;margin:-118px auto 0;width:82%;background:#f6eedd;color:#2a2015;padding:20px 16px;text-align:center;border:1px solid #2a2015;outline:1px solid #f6eedd;outline-offset:3px}.wax .p-label h1{font:500 36px/1 "Cormorant SC",serif;margin:0}.wax .p-label .p-tag{display:block;font-size:13.5px;margin-top:6px}.wax .b-social{margin-top:20px}.wax .b-head{font-size:27px}.wax .h-after{text-align:center}.wax .h-after .b-social{justify-content:center}.wax .h-after p{margin-inline:auto}.wax .p-label .p-tag{color:#6b5a42}`,
    header: (p) =>
        `<div class="p-glow">${picture(p)}</div><header class="p-label">${p.name}${p.tagline}</header><div class="h-after">${p.bio}${p.links}</div>`,
});
