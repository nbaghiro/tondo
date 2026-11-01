import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createAccountStore, createDb, createPageStore } from "@tondo/db";
import { createApp } from "./app";
import { mountSite } from "./site";

const { db } = createDb();
const baseUrl = process.env["NEON_AUTH_BASE_URL"];
const cookieSecret = process.env["NEON_AUTH_COOKIE_SECRET"];
const production = process.env["NODE_ENV"] === "production";
const app = createApp({
    auth: {
        store: createAccountStore(db),
        siteUrl: process.env["SITE_URL"] ?? (production ? "" : "http://localhost:8103"),
        editorUrl: process.env["EDITOR_URL"] ?? (production ? "/app" : "http://localhost:8100"),
        neon: baseUrl && cookieSecret ? { baseUrl, cookieSecret } : undefined,
    },
    mountSite: production ? mountSite : undefined,
    pages: createPageStore(db),
    // Demo photos, until object storage takes over. The server runs from apps/server.
    photos: serveStatic({
        root: "../../packages/brand/photos",
        rewriteRequestPath: (path) => path.replace(/^\/photos/, ""),
    }),
});
const port = Number(process.env["PORT"] ?? 8101);

serve({ fetch: app.fetch, hostname: process.env["HOST"] ?? "127.0.0.1", port }, () => {
    process.stdout.write(`Server listening on http://127.0.0.1:${port}\n`);
});
