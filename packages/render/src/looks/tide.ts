import { defineLook } from "../define-look";

export const tide = defineLook({
    label: "Tide",
    fonts: "family=Literata:opsz,wght@7..72,600&family=Mulish:wght@400;500;600;700",
    palette: ["#27a39b", "#8bd8c4", "#ffd25e", "#1a8585"],
    seed: 29,
    css: `.tide{--sel:#e8862e;--bg:#0f6e70;--fg:#f2fbf6;--mut:#c6e6df;--card:#f2fbf6;--cardfg:#0b4547;--line:#6fb5ae;--btn:#ffd25e;--btnfg:#0b4547;--acc:#e8862e;--ribfg:#0b4547;--disp:Literata,serif;--dw:600;--body:Mulish,sans-serif;--r:16px;--hal:left}.tide .b-rib{background:#ffd25e}.tide .b-ev{--line:#6fb5ae}.tide .b-chip{background:#ffd25e;color:#0b4547!important}.tide .b-stats b{color:#ffd25e}.tide .b-logos span{color:#f2fbf6}.tide .p-head{padding-top:26px}.tide .p-head h1{font-size:34px}.tide .p-paint{opacity:.85}.tide .b-tip .b-btn{background:#0b4547;color:#fff!important;border-color:#0b4547}.tide .b-tip a.on{background:#0b4547;color:#fff!important;border-color:#0b4547}.tide .b-enq button{background:#0b4547;color:#fff!important;border-color:#0b4547}.tide :is(.b-tip,.b-book,.b-enq,.b-form,.b-svc,.b-file,.b-tiers,.b-feature,.b-evnext,.b-map,.b-text-card,.b-hours,.b-count,.b-quote-card,.b-posts-c,.b-prod){--btn:#0b4547;--btnfg:#fff}`,
});
