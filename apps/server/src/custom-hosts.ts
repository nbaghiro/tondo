import type { LivePage } from "@tondo/db";
import type { Context, Hono, Next } from "hono";
import { NO_PAGE } from "./no-page";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

type Found = LivePage & { domain: string | null };

/** The name a request was sent to, in lowercase with no port or final dot. Null if it has none. */
export function hostOf(header: string | undefined): string | null {
    if (!header || !URL.canParse(`http://${header}`)) return null;
    const url = new URL(`http://${header}`);
    if (url.username || url.password || url.pathname !== "/") return null;
    return url.hostname.replace(/\.+$/, "") || null;
}

/**
 * Runs before everything else, so a request to any name that isn't Tondo's own can only ever reach the
 * one page holding that domain. The app, the API and the marketing site don't exist there. `Host` is
 * what the router sent, and forwarded headers are never read, because anyone can send those.
 */
export function mountCustomHosts(
    app: Hono,
    {
        appHosts,
        mainOrigin,
        holderOf,
        live,
        draw,
        follow,
        scale,
        byIp,
        headers,
    }: {
        appHosts: ReadonlySet<string>;
        mainOrigin: string;
        /** The address of the page holding this domain. */
        holderOf: (host: string) => Promise<string | null>;
        /** The page, if visitors can see it at its domain now. */
        live: (handle: string) => Promise<Found | null>;
        draw: (c: Context, found: Found, handle: string) => Response;
        follow: (c: Context, found: Found, target: string) => Response;
        scale: Scale;
        byIp: (c: Context) => string;
        headers: Record<string, string>;
    },
): void {
    const noPage = NO_PAGE.replace('href="/login"', `href="${mainOrigin}/login"`);
    const nothing = (c: Context) => c.html(noPage, 404, headers);
    const allow = createLimiter(scale(300), 60_000);
    app.use(async (c, next) => {
        if (c.req.path === "/health") return next();
        const host = hostOf(c.req.header("host"));
        if (host && appHosts.has(host)) return next();
        if (!allow(byIp(c))) return c.text("Too many tries. Wait a little and try again.", 429);
        return serve(c, host, next);
    });
    const serve = async (c: Context, host: string | null, next: Next) => {
        if (!host || (c.req.method !== "GET" && c.req.method !== "HEAD")) return nothing(c);
        const handle = await holderOf(host);
        if (!handle) {
            const bare = host.startsWith("www.") ? host.slice(4) : null;
            if (bare && (await holderOf(bare))) {
                const { pathname, search } = new URL(c.req.url);
                return c.redirect(`https://${bare}${pathname}${search}`, 301);
            }
            return nothing(c);
        }
        const found = await live(handle);
        // Only the domain's holder, and only while its plan covers it and it's online.
        if (found?.domain !== host) return nothing(c);
        const { path } = c.req;
        if (path === "/") return draw(c, found, handle);
        const link = /^\/l\/([^/]+)\/([^/]+)$/.exec(path);
        if (link) return link[1] === handle ? follow(c, found, link[2] ?? "") : nothing(c);
        if (path === "/robots.txt") {
            return c.text(`User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`);
        }
        if (path === "/sitemap.xml") {
            return c.body(
                `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${host}/</loc></url></urlset>`,
                200,
                { "Content-Type": "application/xml; charset=utf-8" },
            );
        }
        // Photos are public at tondo.page too, and the page needs them from its own address.
        if (path.startsWith("/photos/")) return next();
        return nothing(c);
    };
}
