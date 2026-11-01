import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

// The editor loads only from here. Its canvas frames inherit this, and have no scripts of their own.
const APP_POLICY =
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; frame-src 'self' about:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

// One origin, as Galleo does: the server runs from apps/server and serves the built apps itself,
// which keeps Neon Auth's cookies first-party. Anything not found falls through to public pages.
export function mountSite(app: Hono): void {
    const editor = "../editor/dist";
    const strip = (path: string) => path.replace(/^\/app/, "") || "/";
    app.use(async (c, next) => {
        await next();
        const { pathname } = new URL(c.req.url);
        if (pathname === "/app" || pathname.startsWith("/app/")) {
            c.header("Content-Security-Policy", APP_POLICY);
        } else if (!c.res.headers.has("Content-Security-Policy")) {
            c.header("Content-Security-Policy", "frame-ancestors 'self'");
        }
    });
    app.use("/app/*", serveStatic({ root: editor, rewriteRequestPath: strip }));
    app.use("/app", serveStatic({ root: editor, rewriteRequestPath: strip }));
    app.get("/app/*", serveStatic({ path: `${editor}/index.html` }));
    app.use("*", serveStatic({ root: "../marketing/dist" }));
}
