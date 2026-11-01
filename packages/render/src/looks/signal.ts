import { defineLook } from "../define-look";

export const signal = defineLook({
    label: "Signal",
    fonts: "family=Archivo:wght@400;500;700&family=Archivo+Black",
    palette: ["#ff8a00", "#ff4d00", "#ffb000", "#ffc400"],
    seed: 31,
    css: `.signal{--sel:#0c0c0c;--bg:#ffe100;--fg:#0c0c0c;--mut:#3b3700;--card:#0c0c0c;--cardfg:#fff;--line:rgba(255,255,255,.2);--btn:#0c0c0c;--btnfg:#ffe100;--acc:#0c0c0c;--ribfg:#ffe100;--disp:"Archivo Black",sans-serif;--dw:400;--body:Archivo,sans-serif;--r:14px}.signal .p-head h1{font-size:46px;line-height:.98;letter-spacing:-.02em;text-transform:none}.signal .p-head{text-align:left;padding-top:34px}.signal .p-head p{margin-left:0;color:#0c0c0c}.signal .p-av{width:88px;height:88px;margin:0 0 14px;border:3px solid #0c0c0c}.signal .b-social{justify-content:flex-start}.signal .p-paint{width:340px;left:auto;right:-100px;margin:0;top:-110px}.signal .b-head{font-size:24px}.signal .b-thumb small{opacity:.8}.signal .p-av{margin:0 0 12px}.signal :is(.b-tip,.b-book,.b-enq,.b-form,.b-svc,.b-file,.b-tiers,.b-feature,.b-evnext,.b-map,.b-text-card,.b-revs,.b-contact,.b-contact-b,.b-player,.b-thumb,.b-count,.b-hours,.b-quote-card,.b-posts-c,.b-prod){--btn:#ffe100;--btnfg:#0c0c0c;--acc:#ffe100;--ribfg:#0c0c0c}.signal .b-menu small,.signal .b-faq p,.signal .b-line small,.signal .b-line span{color:#2c2900}`,
});
