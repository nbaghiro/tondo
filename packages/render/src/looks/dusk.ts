import { defineLook } from "../define-look";

export const dusk = defineLook({
    label: "Dusk",
    fonts: "family=Instrument+Serif&family=Hanken+Grotesk:wght@400;500;700",
    palette: ["#f4a56a", "#e05f8c", "#f7d38a", "#6a3fc4"],
    seed: 22,
    screen: true,
    css: `.dusk{--bg:#121832;--fg:#f4effb;--mut:#b9b6d4;--card:rgba(255,255,255,.08);--cardfg:#f4effb;--line:rgba(255,255,255,.2);--btn:#f4effb;--btnfg:#121832;--acc:#e05f8c;--disp:"Instrument Serif",serif;--dw:400;--body:"Hanken Grotesk",sans-serif;--r:22px;--sel:#ff8fb4}.dusk .h-own .p-head h1{font-size:44px}.dusk .h-own .p-av{width:136px;height:136px;border:2px solid rgba(255,255,255,.6)}.dusk .h-own .p-paint{opacity:.8;top:-290px}`,
});
