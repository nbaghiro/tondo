import { defineLook } from "../define-look";

export const lagoon = defineLook({
    label: "Lagoon",
    fonts: "family=Hanken+Grotesk:wght@400;500;700&family=Syne:wght@700",
    palette: ["#22b8b0", "#7fdcd2", "#ff9b73", "#ffd3a8"],
    seed: 26,
    css: `.lagoon{--sel:#ff7a59;--bg:#e8f6f5;--fg:#07363f;--mut:#3f6a70;--card:#fff;--cardfg:#07363f;--line:#bfe0de;--btn:#07636f;--btnfg:#fff;--acc:#ff7a59;--ribfg:#07363f;--disp:Syne,sans-serif;--dw:700;--body:"Hanken Grotesk",sans-serif;--r:18px}.lagoon .p-head{padding-top:30px}.lagoon .p-head h1{font-size:36px;letter-spacing:-.02em}`,
});
