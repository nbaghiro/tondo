export const baseCss = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0}
.tondo{display:block;width:100%;height:auto;overflow:visible}.ic{width:24px;height:24px;display:block}
.look{--r:18px;--rb:999px;background:var(--bg);color:var(--fg);font:16px/1.45 var(--body);scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--fg) 28%,transparent) transparent}
.look a{color:inherit;text-decoration:none}.look img{display:block;width:100%;height:100%;object-fit:cover}.look b{font-weight:700}
.page{position:relative;overflow:hidden;min-height:100vh;max-width:480px;margin:auto;padding:0 18px 34px;isolation:isolate}
.p-paint{position:absolute;z-index:-1;width:520px;left:50%;margin-left:-260px;top:-310px}
.p-head{text-align:center;padding-top:42px}.p-av{display:block;width:112px;height:112px;margin:0 auto 12px;border-radius:50%;overflow:hidden;border:4px solid var(--bg)}
.p-head h1{overflow-wrap:anywhere;font:var(--dw,500) 29px/1.1 var(--disp);margin:0}.p-head p{margin:8px auto 0;max-width:30em;font-size:15.5px;color:var(--mut)}.p-tag{font-size:14px;color:var(--mut);display:block;margin-top:5px}
.b-social{display:flex;justify-content:center;gap:16px;margin:16px 0 8px}.b-hl{border-radius:var(--r);box-shadow:0 0 0 3px var(--acc)}
.p-av img{display:block;width:100%;height:100%;object-fit:cover}.p-btn{margin-top:14px}
.h-left .p-head{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center;text-align:left;padding-top:34px}.h-left .p-av{width:92px;height:92px;margin:0}.h-after p{margin:12px 0 0;color:var(--mut)}.h-after .b-social{justify-content:flex-start}
.h-full .h-pic{margin:0 -18px;height:430px;position:relative;overflow:hidden}.h-full .h-pic::after{content:"";position:absolute;inset:40% 0 0;background:linear-gradient(transparent,var(--bg))}.h-full .p-head{margin-top:-60px;padding-top:0;position:relative;z-index:1}
.h-arch .h-pic{height:300px;width:80%;margin:34px auto 0;border-radius:200px 200px 14px 14px;overflow:hidden;position:relative}.h-arch .p-head{padding-top:16px}.h-arch .p-paint{top:-170px}
.h-banner .h-pic{margin:0 -18px;height:190px;overflow:hidden}.h-banner .p-head{margin-top:-52px;padding-top:0;position:relative}`;
