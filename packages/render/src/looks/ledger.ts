import { defineLook } from "../define-look";

export const ledger = defineLook({
    label: "Ledger",
    fonts: "family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;700",
    palette: ["#c0392b", "#163524", "#b4cfa9"],
    seed: 32,
    css: `.ledger{--sel:#c0392b;--bg:#f3f7e9;--fg:#163524;--mut:#49644f;--card:#fbfdf5;--cardfg:#163524;--line:#b4cfa9;--btn:#163524;--btnfg:#f3f7e9;--acc:#c0392b;--disp:"IBM Plex Mono",monospace;--dw:600;--body:"IBM Plex Sans",sans-serif;--r:2px;--rb:2px;--hal:left}.ledger .page{background:repeating-linear-gradient(transparent 0 31px,#cfe2c5 31px 32px)}.ledger .page::before{content:"";position:absolute;top:0;bottom:0;left:12px;border-left:2px solid rgba(192,57,43,.35)}.ledger .p-head{text-align:left;padding:34px 0 0 8px}.ledger .p-head h1{font-size:38px;line-height:1.05;letter-spacing:-.04em}.ledger .p-head p{margin-left:0;color:#163524}.ledger .b-social{justify-content:flex-start}.ledger .b-head{font-size:18px;background:#f3f7e9;display:table;padding-right:8px}.ledger .b-file{background:#fbfdf5}.ledger .b-tiers>div{background:#fbfdf5}.ledger .b-faq{background:#fbfdf5}.ledger .b-faq{padding:0 12px}.ledger .b-countline{color:#fff}.ledger .p-av{margin:0 0 12px}`,
    header: (p) =>
        `<header class="p-head">${p.avatar}${p.name}${p.tagline}${p.bio}${p.links}</header>`,
});
