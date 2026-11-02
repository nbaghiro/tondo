import { routes } from "@tondo/contract";
import type { ErrorResponse, HealthResponse } from "@tondo/contract";
import type { LivePage, PageStore } from "@tondo/db";
import { handleSchema, isOnline, normaliseHandle } from "@tondo/page";
import { findLink, renderDocument } from "@tondo/render";
import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mountAssistant } from "./assistant";
import type { AssistantDeps } from "./assistant";
import { AuthUnavailable, mountAuth } from "./auth";
import type { AuthConfig } from "./auth";
import { isBlockedLink } from "./blocked";
import { limitsOf } from "./limits";
import { mountBilling } from "./billing";
import { NO_PAGE } from "./no-page";
import { mountPages } from "./pages";
import { folderFor, mountPhotos } from "./photos";
import type { Storage } from "./storage";
import type { Payments } from "./stripe";
import { clientIp, countsAsVisit, createCache, limit } from "./traffic";
import type { Count, Scale } from "./traffic";

export interface AppDeps {
    pages: PageStore;
    photos?: MiddlewareHandler;
    /** Where uploads go. Without this, uploads explain that they aren't set up. */
    storage?: Storage | null | undefined;
    /** Serves the built marketing site and editor, in production. */
    mountSite?: ((app: Hono) => void) | undefined;
    auth: AuthConfig;
    /** Adds up counts. Without this, each one is written straight away. */
    count?: Count;
    /** This site's address as visitors see it, for link previews. */
    publicOrigin?: string | undefined;
    /** Multiplies the rate limits. Tests share one address, so they raise it. */
    scale?: Scale;
    /** Help me. Without this, its button doesn't appear and everything else works. */
    assistant?: Omit<AssistantDeps, "storage"> | null | undefined;
    /** Stripe. Without this, the billing routes don't exist. */
    payments?: Payments | null | undefined;
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

const PAGE_CACHE_MS = 15_000;

export function createApp({
    pages,
    photos,
    storage,
    mountSite,
    auth,
    count,
    publicOrigin,
    scale = (max) => max,
    assistant = null,
    payments = null,
}: AppDeps) {
    const app = new Hono();
    const notFound: ErrorResponse = { error: "We couldn't find that page." };
    const cache = createCache<LivePage | null>(PAGE_CACHE_MS);
    // A count that fails to save shouldn't stop anyone reaching a page.
    const add: Count =
        count ??
        ((pageId, target) => {
            pages.count(pageId, target).catch((error: unknown) => {
                process.stderr.write(`Couldn't save a count: ${String(error)}\n`);
            });
        });
    // Worked out per request from the cached plan, so a plan's end date passes when it should.
    const live = async (raw: string) => {
        const handle = normaliseHandle(raw);
        if (!handleSchema.safeParse(handle).success) return null;
        const found = await cache.get(handle, () => pages.findLive(handle));
        return found && isOnline(limitsOf(found), found.rank) ? found : null;
    };

    // A sandboxed frame or a data: page sends this, and neither should be able to act for someone.
    app.use("/api/*", async (c, next) => {
        if (c.req.method !== "GET" && c.req.header("origin") === "null") {
            return c.json<ErrorResponse>({ error: "This request isn't allowed." }, 403);
        }
        return next();
    });
    app.onError((error, c) => {
        if (error instanceof AuthUnavailable) {
            process.stderr.write(`Sign-in is unreachable: ${error.message}\n`);
            return c.json<ErrorResponse>(
                { error: "We can't check your sign-in right now. Your work is safe." },
                503,
            );
        }
        process.stderr.write(`Request failed: ${String(error)}\n`);
        return c.json<ErrorResponse>({ error: "Something went wrong on our side." }, 500);
    });

    // Addresses are lowercase, whatever someone types or a phone capitalises.
    app.use(async (c, next) => {
        const { pathname, search } = new URL(c.req.url);
        if (/^\/[^/.]*[A-Z][^/.]*$/.test(pathname)) {
            return c.redirect(`${pathname.toLowerCase()}${search}`, 301);
        }
        await next();
        return undefined;
    });

    app.use(async (c, next) => {
        await next();
        c.header("X-Content-Type-Options", "nosniff");
    });

    app.get(routes.health, (c) => c.json<HealthResponse>({ status: "ok" }));

    const limitsOfPerson = async (userId: string) => limitsOf(await auth.store.findPlan(userId));
    const onHandleChange = (before: string | null, after: string | null) => {
        if (before) cache.drop(before);
        if (after) cache.drop(after);
    };
    const dropPagesOf = async (userId: string) => {
        for (const { handle } of await pages.listPages(userId)) cache.drop(handle);
    };
    const currentPerson = mountAuth(app, {
        ...auth,
        scale,
        onHandleChange,
        cancelBilling: async (userId) => {
            const customer = await auth.store.findStripeId(userId);
            if (customer) await payments?.deleteCustomer(customer);
        },
        removeFiles: async (userId) => {
            if (!storage) return;
            const files = await storage.list(folderFor(userId));
            await Promise.all(files.map((file) => storage.remove(file)));
        },
    });
    // Publishing has to show straight away, so it clears that page from the cache.
    mountPages(app, pages, currentPerson, {
        scale,
        limitsOfPerson,
        onHandleChange,
        onLivePagesChange: dropPagesOf,
    });
    if (payments) {
        mountBilling(app, {
            payments,
            store: auth.store,
            currentPerson,
            scale,
            onPlanChange: dropPagesOf,
            appUrl: (c) =>
                new URL(
                    auth.editorUrl,
                    auth.siteUrl || (publicOrigin ?? new URL(c.req.url).origin),
                ).href.replace(/\/$/, ""),
        });
    }
    mountPhotos(app, storage ?? null, currentPerson, { scale, pages, limitsOfPerson });
    mountAssistant(
        app,
        assistant ? { ...assistant, storage: storage ?? null } : null,
        currentPerson,
        scale,
        limitsOfPerson,
    );
    if (photos) app.get("/photos/*", photos);

    const byIp = (c: Context) => clientIp(c);

    // The destination comes from the live page, so this can't be used to send people elsewhere.
    app.get("/l/:handle/:target", limit(scale(120), byIp), async (c) => {
        const found = await live(c.req.param("handle"));
        const target = c.req.param("target");
        const url = found ? findLink(found.page, target) : null;
        // A link added to the blocklist after publishing stops working straight away.
        if (!found || !url || isBlockedLink(url)) return c.text(notFound.error, 404);
        if (countsAsVisit(c)) add(found.id, target);
        c.header("Cache-Control", "no-store");
        return c.redirect(url, 302);
    });

    mountSite?.(app);

    app.get("/:handle", limit(scale(300), byIp), async (c) => {
        const handle = normaliseHandle(c.req.param("handle"));
        const found = await live(handle);
        if (!found) return c.html(NO_PAGE, 404, PAGE_HEADERS);
        if (countsAsVisit(c)) add(found.id, "");
        const origin = publicOrigin ?? new URL(c.req.url).origin;
        const { page } = found;
        return c.html(
            renderDocument(page, {
                title: page.header.name,
                assetBase: "/photos/",
                editable: false,
                live: true,
                trackAs: handle,
                shareUrl: `${origin}/${handle}`,
                onDrawError: (type, error) => {
                    process.stderr.write(`Couldn't draw a ${type} block: ${String(error)}\n`);
                },
            }),
            200,
            PAGE_HEADERS,
        );
    });

    return app;
}
