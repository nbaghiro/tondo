import { defineLook } from "../define-look";

export const volt = defineLook({
    label: "Volt",
    fonts: "family=Anton&family=Archivo:wght@400;500;700",
    palette: ["#ccff33", "#7dbb00", "#e8ff8a", "#3f6b00"],
    seed: 33,
    screen: true,
    css: `.volt{--sel:#ccff33;--bg:#0e0f0c;--fg:#f3f6ea;--mut:#a7ab9b;--card:#1a1c16;--cardfg:#f3f6ea;--line:#34372c;--btn:#ccff33;--btnfg:#0e0f0c;--acc:#ccff33;--ribfg:#0e0f0c;--disp:Anton,sans-serif;--dw:400;--body:Archivo,sans-serif;--r:8px;--rb:8px}.volt .p-head{padding-top:96px;text-align:left}.volt .p-paint{width:440px;left:auto;right:-150px;margin:0;top:-120px;opacity:.55}.volt .p-head h1{font-size:62px;line-height:1;letter-spacing:.005em}.volt .p-head p{margin-left:0;color:var(--fg)}.volt .b-social{justify-content:flex-start}.volt .b-head{font-size:27px}.volt .p-av{margin:0 0 12px}`,
});
