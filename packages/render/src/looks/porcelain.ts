import { defineLook } from "../define-look";

export const porcelain = defineLook({
    label: "Porcelain",
    fonts: "family=Fraunces:opsz,SOFT,wght@9..144,100,400;9..144,100,500;9..144,100,600&family=Mulish:wght@400;500;600;700",
    palette: ["#c8385f", "#e8876a", "#a42a55", "#f2b56b"],
    seed: 9,
    css: `.porcelain{--bg:#fff;--fg:#3b1222;--mut:#54303c;--card:#fff;--cardfg:#3b1222;--line:#efe3e6;--btn:#3b1222;--btnfg:#fff;--acc:#a42a55;--disp:Fraunces,serif;--body:Mulish,sans-serif;--r:20px;--sel:#a42a55}`,
});
