import { routes } from "@tondo/contract";
import type { ErrorResponse, HealthResponse } from "@tondo/contract";
import type { PageStore } from "@tondo/db";
import { handleSchema, normaliseHandle } from "@tondo/page";
import { findLink, renderDocument } from "@tondo/render";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { mountAuth } from "./auth";
import type { AuthConfig } from "./auth";
import { mountPages } from "./pages";
import { mountPhotos } from "./photos";
import type { Storage } from "./storage";

export interface AppDeps {
    pages: PageStore;
    photos?: MiddlewareHandler;
    /** Where uploads go. Without this, uploads explain that they aren't set up. */
    storage?: Storage | null | undefined;
    /** Serves the built marketing site and editor, in production. */
    mountSite?: ((app: Hono) => void) | undefined;
    auth: AuthConfig;
}

// Public pages hold other people's content and need no scripts, so the browser is told to run none.
const PAGE_HEADERS = {
    "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Visitors see a publish straight away. A CDN in front can cache this for a short time instead.
    "Cache-Control": "no-cache",
};

// A count that fails to save shouldn't stop anyone reaching a page.
const counted = (work: Promise<void>) => {
    work.catch((error: unknown) => {
        process.stderr.write(`Couldn't save a count: ${String(error)}\n`);
    });
};

export function createApp({ pages, photos, storage, mountSite, auth }: AppDeps) {
    const app = new Hono();
    const notFound: ErrorResponse = { error: "We couldn't find that page." };
    const live = (raw: string) => {
        const handle = normaliseHandle(raw);
        return handleSchema.safeParse(handle).success
            ? pages.findLive(handle)
            : Promise.resolve(null);
    };

    // Addresses are lowercase, whatever someone types or a phone capitalises.
    app.use(async (c, next) => {
        const { pathname, search } = new URL(c.req.url);
        if (/^\/[^/.]*[A-Z][^/.]*$/.test(pathname)) {
            return c.redirect(`${pathname.toLowerCase()}${search}`, 301);
        }
        await next();
        return undefined;
    });

    app.get(routes.health, (c) => c.json<HealthResponse>({ status: "ok" }));

    const currentPerson = mountAuth(app, auth);
    mountPages(app, pages, currentPerson);
    mountPhotos(app, storage ?? null, currentPerson);
    if (photos) app.get("/photos/*", photos);

    // The destination comes from the live page, so this can't be used to send people elsewhere.
    app.get("/l/:handle/:target", async (c) => {
        const found = await live(c.req.param("handle"));
        const target = c.req.param("target");
        const url = found ? findLink(found.page, target) : null;
        if (!found || !url) return c.text(notFound.error, 404);
        counted(pages.count(found.id, target));
        c.header("Cache-Control", "no-store");
        return c.redirect(url, 302);
    });

    mountSite?.(app);

    app.get("/:handle", async (c) => {
        const handle = c.req.param("handle");
        const found = await live(handle);
        if (!found) return c.text(notFound.error, 404);
        counted(pages.count(found.id, ""));
        return c.html(
            renderDocument(found.page, {
                title: found.page.header.name,
                assetBase: "/photos/",
                editable: false,
                live: true,
                trackAs: handle,
            }),
            200,
            PAGE_HEADERS,
        );
    });

    return app;
}
