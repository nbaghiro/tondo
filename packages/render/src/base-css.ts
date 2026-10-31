export const baseCss = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0}
.tondo{display:block;width:100%;height:auto;overflow:visible}.ic{width:24px;height:24px;display:block}
.look{--r:18px;--rb:999px;background:var(--bg);color:var(--fg);font:16px/1.45 var(--body);scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--fg) 28%,transparent) transparent}
.look a{color:inherit;text-decoration:none}.look img{display:block;width:100%;height:100%;object-fit:cover}.look b{font-weight:700}
.page{position:relative;overflow:hidden;min-height:100vh;max-width:480px;margin:auto;padding:0 18px 34px;isolation:isolate}
.p-paint{position:absolute;z-index:-1;width:520px;left:50%;margin-left:-260px;top:-310px}
.p-head{text-align:center;padding-top:42px}.p-av{display:block;width:112px;height:112px;margin:0 auto 12px;border-radius:50%;overflow:hidden;border:4px solid var(--bg)}
.p-zoom img{transform:scale(var(--zoom));transform-origin:9.5% 5%}
.p-head h1{font:var(--dw,500) 29px/1.1 var(--disp);margin:0}.p-head p{margin:8px auto 0;max-width:30em;font-size:15.5px;color:var(--mut)}.p-tag{font-size:14px;color:var(--mut);display:block;margin-top:5px}
.b-social{display:flex;justify-content:center;gap:16px;margin:16px 0 8px}`;
