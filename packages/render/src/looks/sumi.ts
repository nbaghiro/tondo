import { defineLook } from "../define-look";

export const sumi = defineLook({
    label: "Sumi",
    fonts: "family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700",
    palette: ["#15151a"],
    seed: 7,
    ring: 16,
    css: `.sumi{--bg:#f8f8f5;--fg:#15151a;--mut:#5a5a62;--card:transparent;--cardfg:#15151a;--line:#15151a;--btn:#15151a;--btnfg:#fff;--acc:#c5321f;--disp:"Shippori Mincho",serif;--body:"Zen Kaku Gothic New",sans-serif;--r:2px;--rb:2px;--sel:#c5321f}.sumi .b-thumb{border-width:0 0 1px;border-radius:0;padding:10px 0}.sumi .b-btn.alt{border-width:0 0 1px;border-radius:0;text-align:left;padding:13px 0;font-weight:500}.sumi .b-form{border:0;padding:0;margin-top:24px}.sumi .b-form input{border-width:0 0 1px;border-radius:0;padding-left:0}.sumi .h-own .p-head{padding-top:246px;text-align:left}.sumi .h-own .p-head h1{font-size:36px}.sumi .h-own .p-paint{width:210px;left:14px;margin:0;top:26px}.sumi .h-own .p-av{position:absolute;left:68px;top:80px;width:102px;height:102px;margin:0;border:0}.sumi .h-own .b-social{justify-content:flex-start}`,
});
