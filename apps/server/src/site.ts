import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

// One origin, as Galleo does: the server runs from apps/server and serves the built apps itself,
// which keeps Neon Auth's cookies first-party. Anything not found falls through to public pages.
export function mountSite(app: Hono): void {
    const editor = "../editor/dist";
    const strip = (path: string) => path.replace(/^\/app/, "") || "/";
    app.use("/app/*", serveStatic({ root: editor, rewriteRequestPath: strip }));
    app.use("/app", serveStatic({ root: editor, rewriteRequestPath: strip }));
    app.get("/app/*", serveStatic({ path: `${editor}/index.html` }));
    app.use("*", serveStatic({ root: "../marketing/dist" }));
}
