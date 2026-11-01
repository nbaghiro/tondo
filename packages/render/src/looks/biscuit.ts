import { defineLook } from "../define-look";

export const biscuit = defineLook({
    label: "Biscuit",
    fonts: "family=Fredoka:wght@400;500;600",
    palette: ["#d9531e", "#4b2a10", "#e8c677"],
    seed: 40,
    css: `.biscuit{--sel:#d9531e;--bg:#ffe08a;--fg:#4b2a10;--mut:#6e4a22;--card:#fff8e4;--cardfg:#4b2a10;--line:#e8c677;--btn:#4b2a10;--btnfg:#ffe9ae;--acc:#d9531e;--disp:Fredoka,sans-serif;--dw:600;--body:Fredoka,sans-serif;--r:26px;--line-b:2.5px solid #4b2a10;--sh:0 4px 0 #4b2a10;--hal:center}.biscuit .p-av{width:164px;height:164px;border:3px solid #4b2a10;border-radius:46% 54% 52% 48%/55% 48% 52% 45%}.biscuit .p-head h1{font-size:37px;line-height:1.05}.biscuit .b-btn{box-shadow:none}.biscuit .b-svc .b-chip{background:#d9531e;color:#fff!important}.biscuit .b-social a{color:#4b2a10}.biscuit .b-faq{--line:#4b2a10}`,
    header: (p) =>
        `<header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
