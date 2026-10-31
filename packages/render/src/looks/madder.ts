import { defineLook } from "../define-look";

export const madder = defineLook({
    label: "Madder",
    fonts: "family=Fraunces:opsz,SOFT,wght@9..144,100,400;9..144,100,500;9..144,100,600&family=Mulish:wght@400;500;600;700",
    palette: ["#c8385f", "#e8876a", "#a42a55", "#f2b56b"],
    seed: 9,
    css: `.madder{--bg:#fdf6f2;--fg:#3b1222;--mut:#6f4a55;--card:#fff;--cardfg:#3b1222;--line:#efd9d0;--btn:#a42a55;--btnfg:#fff;--acc:#a42a55;--disp:Fraunces,serif;--body:Mulish,sans-serif;--r:20px;--sel:#a42a55}`,
});
