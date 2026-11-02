import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import {
    createAccountStore,
    createDb,
    createDomainStore,
    createPageStore,
    createTeamStore,
    createUsageStore,
} from "@tondo/db";
import { createApp } from "./app";
import { assistantFromEnv } from "./assistant-setup";
import { hostOf } from "./custom-hosts";
import { hostingFromEnv } from "./hosting";
import { mountSite } from "./site";
import { plansOn } from "./limits";
import { createS3Storage, storageConfig } from "./storage";
import { paymentsFromEnv } from "./stripe";
import { createCounter } from "./traffic";

const { db, close } = createDb();
const baseUrl = process.env["NEON_AUTH_BASE_URL"];
const cookieSecret = process.env["NEON_AUTH_COOKIE_SECRET"];
const production = process.env["NODE_ENV"] === "production";
const config = storageConfig(process.env, production);
const storage = config ? createS3Storage(config) : null;
if (storage && !production) {
    storage.ensureBucket().catch(() => {
        process.stdout.write(
            "Object storage isn't running, so uploads won't work. Try pnpm services:up.\n",
        );
    });
}
const pages = createPageStore(db);
const counter = createCounter(pages.count, Number(process.env["COUNT_FLUSH_MS"] ?? 5 * 1000));
const limitScale = Number(process.env["RATE_LIMIT_SCALE"] ?? 1);
// Refusing to publish with no way to pay would be a dead end, so this stops the deploy and the old one
// stays live.
const payments = paymentsFromEnv(process.env);
if (plansOn()) {
    if (!payments) {
        process.stderr.write(
            "PLANS_ON is true, and the Stripe key or webhook secret is missing.\n",
        );
        process.exit(1);
    }
    await payments.checkPrices().catch((error: unknown) => {
        process.stderr.write(`Stripe's Prices aren't ready: ${String(error)}\n`);
        process.exit(1);
    });
}
process.stdout.write(`Plans are ${plansOn() ? "on" : "off"}.\n`);
const publicOrigin =
    process.env["PUBLIC_ORIGIN"] ?? (production ? "https://tondo.page" : undefined);
const siteUrl = process.env["SITE_URL"] ?? (production ? "" : "http://localhost:8103");
const editorUrl = process.env["EDITOR_URL"] ?? (production ? "/app" : "http://localhost:8100");
const hosting = hostingFromEnv(process.env);
process.stdout.write(`Custom domains are ${hosting ? "on" : "off"}.\n`);
// Every name that reaches the whole site. Anything else can only reach the page holding that domain.
const appHosts = new Set(
    [
        publicOrigin,
        siteUrl,
        editorUrl,
        process.env["RENDER_EXTERNAL_HOSTNAME"],
        ...(process.env["APP_HOSTS"] ?? "").split(","),
        ...(production ? [] : ["localhost", "127.0.0.1"]),
    ].flatMap((value) => {
        const host = value && hostOf(value.replace(/^https?:\/\//, ""));
        return host ? [host] : [];
    }),
);
const app = createApp({
    payments,
    domains: hosting ? { store: createDomainStore(db), hosting, appHosts } : null,
    assistant: assistantFromEnv(process.env, createUsageStore(db)),
    storage,
    count: counter.count,
    publicOrigin,
    scale: (max) => max * limitScale,
    auth: {
        store: createAccountStore(db),
        siteUrl,
        editorUrl,
        neon: baseUrl && cookieSecret ? { baseUrl, cookieSecret } : undefined,
    },
    mountSite: production ? mountSite : undefined,
    pages,
    teams: createTeamStore(db),
    // The demo photo library. The server runs from apps/server.
    photos: serveStatic({
        root: "../../packages/brand/photos",
        rewriteRequestPath: (path) => path.replace(/^\/photos/, ""),
    }),
});
const port = Number(process.env["PORT"] ?? 8101);

const server = serve(
    { fetch: app.fetch, hostname: process.env["HOST"] ?? "127.0.0.1", port },
    () => {
        process.stdout.write(`Server listening on http://127.0.0.1:${port}\n`);
    },
);

// A deploy stops this process. Waiting counts are saved first, so no visits go missing.
const stop = () => {
    server.close(() => {
        counter
            .stop()
            .then(close)
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    });
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
