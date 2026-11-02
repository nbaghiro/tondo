import { routes } from "@tondo/contract";
import type { ErrorResponse, HealthResponse } from "@tondo/contract";
import type { LivePage, PageStore, TeamStore } from "@tondo/db";
import type { Page } from "@tondo/page";
import {
    canUseDomain,
    handleSchema,
    isCovered,
    isPageOnline,
    limitsFor,
    normaliseHandle,
    withTeamLook,
} from "@tondo/page";
import { findLink, renderDocument } from "@tondo/render";
import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { mountAssistant } from "./assistant";
import type { AssistantDeps } from "./assistant";
import { AuthUnavailable, mountAuth } from "./auth";
import type { AuthConfig } from "./auth";
import { isBlockedLink } from "./blocked";
import { mountCustomHosts } from "./custom-hosts";
import { mountDomains } from "./domains";
import type { DomainDeps } from "./domains";
import { createInvites } from "./invites";
import { limitsOf } from "./limits";
import { mountBilling } from "./billing";
import { NO_PAGE } from "./no-page";
import { mountPages } from "./pages";
import { clearPageFolder, copyPhotosInto, listPhotos, mountPhotos, photoScope } from "./photos";
import { sitemapXml } from "./sitemap";
import { mountTeams } from "./teams";
import type { Storage } from "./storage";
import type { Payments } from "./stripe";
import { clientIp, countsAsVisit, createCache, limit } from "./traffic";
import type { Count, Scale } from "./traffic";

export interface AppDeps {
    pages: PageStore;
    /** Without this, the team routes don't exist. */
    teams?: TeamStore | null | undefined;
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
    assistant?: Omit<AssistantDeps, "storage" | "pages"> | null | undefined;
    /** Stripe. Without this, the billing routes don't exist. */
    payments?: Payments | null | undefined;
    /** Customer domains. Without this, every address serves the whole site, as it did before. */
    domains?: DomainDeps | null | undefined;
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
const SITEMAP_CACHE_MS = 3_600_000;

export function createApp({
    pages,
    teams = null,
    photos,
    storage,
    mountSite,
    auth,
    count,
    publicOrigin,
    scale = (max) => max,
    assistant = null,
    payments = null,
    domains = null,
}: AppDeps) {
    const app = new Hono();
    const notFound: ErrorResponse = { error: "We couldn't find that page." };
    type Found = LivePage & { domain: string | null };
    const cache = createCache<Found | null>(PAGE_CACHE_MS);
    const holders = createCache<string | null>(PAGE_CACHE_MS);
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
        const found = await cache.get(handle, async () => {
            const page = await pages.findLive(handle);
            if (!page) return null;
            const row = await domains?.store.find(page.id);
            return { ...page, domain: row?.verified ? row.host : null };
        });
        if (!found || !isPageOnline(found.standing, limitsOf)) return null;
        const applies = isCovered(found.standing.team, limitsOf);
        return {
            ...found,
            page: withTeamLook(found.page, applies ? found.teamLook : null),
            // The plan can end between reads, so whether the domain counts is worked out each time.
            domain: canUseDomain(found.standing, limitsOf) ? found.domain : null,
        };
    };
    const byIp = (c: Context) => clientIp(c);
    const mainOrigin = publicOrigin ?? auth.siteUrl;

    const followLink = (c: Context, found: Found, target: string) => {
        const url = findLink(found.page, target);
        // A link added to the blocklist after publishing stops working straight away.
        if (!url || isBlockedLink(url)) return c.text(notFound.error, 404);
        if (countsAsVisit(c)) add(found.id, target);
        c.header("Cache-Control", "no-store");
        return c.redirect(url, 302);
    };

    const drawPage = (c: Context, found: Found, handle: string, onDomain: boolean) => {
        if (countsAsVisit(c)) add(found.id, "");
        const origin = publicOrigin ?? new URL(c.req.url).origin;
        const { page } = found;
        return c.html(
            renderDocument(page, {
                title: page.header.name,
                assetBase: "/photos/",
                editable: false,
                live: true,
                badge: !page.hideBadge,
                trackAs: handle,
                shareUrl: found.domain ? `https://${found.domain}/` : `${origin}/${handle}`,
                ...(onDomain ? { reportOrigin: origin } : {}),
                onDrawError: (type, error) => {
                    process.stderr.write(`Couldn't draw a ${type} block: ${String(error)}\n`);
                },
            }),
            200,
            PAGE_HEADERS,
        );
    };

    if (domains) {
        mountCustomHosts(app, {
            appHosts: domains.appHosts,
            mainOrigin,
            holderOf: (host) =>
                holders.get(host, async () => (await domains.store.holder(host))?.handle ?? null),
            live,
            draw: (c, found, handle) => drawPage(c, found, handle, true),
            follow: followLink,
            scale,
            byIp,
            headers: PAGE_HEADERS,
        });
    }

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
    // A domain left at the host isn't served, because our row decides that, so this never stops a delete.
    const offHosting = async (host: string) => {
        await domains?.hosting.remove(host).catch((error: unknown) => {
            process.stderr.write(`Couldn't remove ${host} from hosting: ${String(error)}\n`);
        });
    };
    const onHandleChange = (before: string | null, after: string | null) => {
        if (before) cache.drop(before);
        if (after) cache.drop(after);
    };
    const dropHandles = (handles: readonly string[]) => {
        for (const handle of handles) cache.drop(handle);
    };
    const dropPagesOf = async (userId: string) => {
        dropHandles(await pages.handlesAround(userId));
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
            if (domains) {
                const held = await domains.store.heldBy(userId);
                await Promise.all(held.map(offHosting));
            }
            if (!storage) return;
            const files = await listPhotos(storage, pages, userId);
            await Promise.all(files.map((file) => storage.remove(file)));
        },
    });
    // Publishing has to show straight away, so it clears that page from the cache.
    mountPages(app, pages, currentPerson, {
        scale,
        limitsOfPerson,
        onHandleChange,
        onLivePagesChange: async (pageId) => {
            dropHandles(await pages.handlesAffected(pageId));
        },
        beforeLivePagesChange: (pageId) => pages.handlesAffected(pageId),
        onPageRemoving: async (userId, pageId) => {
            const row = await domains?.store.find(pageId);
            if (row?.verified) {
                holders.drop(row.host);
                await offHosting(row.host);
            }
            if (!storage) return;
            const scope = await photoScope(pages, userId, pageId, limitsOfPerson);
            if (scope) await clearPageFolder(storage, scope, pageId);
        },
        ...(storage
            ? { copyPhotos: (page: Page, pageId: string) => copyPhotosInto(storage, page, pageId) }
            : {}),
    });
    if (payments) {
        mountBilling(app, {
            payments,
            store: auth.store,
            currentPerson,
            scale,
            onPlanChange: dropPagesOf,
            appUrl: (c) => appUrl(c),
        });
    }
    // A person on a covered team has at least the owner's photo allowance.
    const photoLimits = async (userId: string) => {
        const limits = await limitsOfPerson(userId);
        const owner = await teams?.ownerOf(userId);
        return owner && isCovered(owner.account, limitsOf)
            ? { ...limits, photos: Math.max(limits.photos, limitsOf(owner.account).photos) }
            : limits;
    };
    mountPhotos(app, storage ?? null, currentPerson, {
        scale,
        pages,
        limitsOfPerson: photoLimits,
    });
    // Someone with their own paid plan spends their own. Anyone else on a covered team spends the owner's.
    const creditHolder = async (userId: string) => {
        const own = await auth.store.findPlan(userId);
        if (limitsFor(own, new Date()).live > 0) return userId;
        const owner = await teams?.ownerOf(userId);
        return owner && isCovered(owner.account, limitsOf) ? owner.id : userId;
    };
    const appUrl = (c: Context) =>
        new URL(
            auth.editorUrl,
            auth.siteUrl || (publicOrigin ?? new URL(c.req.url).origin),
        ).href.replace(/\/$/, "");
    if (teams && auth.neon) {
        mountTeams(app, {
            teams,
            pages,
            storage: storage ?? null,
            currentPerson,
            invites: createInvites(auth.neon.cookieSecret),
            scale,
            dropAround: dropPagesOf,
            dropHandles,
            appUrl,
        });
    }
    if (domains) {
        mountDomains(app, {
            ...domains,
            pages,
            currentPerson,
            scale,
            onChange: (host, handle) => {
                holders.drop(host);
                cache.drop(handle);
            },
        });
    }
    mountAssistant(
        app,
        assistant ? { ...assistant, storage: storage ?? null, pages } : null,
        currentPerson,
        scale,
        limitsOfPerson,
        photoLimits,
        creditHolder,
    );
    if (photos) app.get("/photos/*", photos);

    // The destination comes from the live page, so this can't be used to send people elsewhere.
    app.get("/l/:handle/:target", limit(scale(120), byIp), async (c) => {
        const found = await live(c.req.param("handle"));
        if (!found) return c.text(notFound.error, 404);
        return followLink(c, found, c.req.param("target"));
    });

    const sitemap = createCache<string>(SITEMAP_CACHE_MS);
    app.get("/sitemap.xml", limit(scale(60), byIp), async (c) => {
        const origin = publicOrigin ?? new URL(c.req.url).origin;
        // A page at its own domain is listed by that domain's sitemap, and not twice.
        const xml = await sitemap.get("all", async () => {
            const held = new Set(
                ((await domains?.store.listHeld()) ?? []).map((row) => row.handle),
            );
            const published = await pages.listPublished();
            return sitemapXml(
                origin,
                published.filter(
                    (page) => !held.has(page.handle) || !canUseDomain(page.standing, limitsOf),
                ),
            );
        });
        return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
    });

    mountSite?.(app);

    app.get("/:handle", limit(scale(300), byIp), async (c) => {
        const handle = normaliseHandle(c.req.param("handle"));
        const found = await live(handle);
        if (!found) return c.html(NO_PAGE, 404, PAGE_HEADERS);
        return drawPage(c, found, handle, false);
    });

    return app;
}
