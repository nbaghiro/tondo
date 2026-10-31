import { claimRequest, routes } from "@tondo/contract";
import type { ErrorResponse, MeResponse } from "@tondo/contract";
import type { AccountStore } from "@tondo/db";
import { isReservedHandle, starterPage } from "@tondo/page";
import {
    DEFAULT_AUTH_SKIP_ROUTES,
    handleAuthProxyRequest,
    processAuthMiddleware,
} from "@neon/auth/server";
import type { Context, Hono } from "hono";

export interface AuthConfig {
    store: AccountStore;
    siteUrl: string;
    editorUrl: string;
    /** Without this, the site still runs and sign-in explains that it isn't set up. */
    neon?: { baseUrl: string; cookieSecret: string } | undefined;
}

interface Person {
    id: string;
    email: string;
    name: string;
}

const NOT_SET_UP = "Sign-in isn't set up yet.";

export function mountAuth(app: Hono, config: AuthConfig): void {
    const { store, siteUrl, editorUrl, neon } = config;

    const fail = (c: Context, status: 400 | 401 | 409 | 415 | 503, error: string) =>
        c.json<ErrorResponse>({ error }, status);

    // Neon's toolkit caches the session in a signed cookie, so most requests don't reach Neon.
    const currentPerson = async (c: Context): Promise<Person | null> => {
        if (!neon) return null;
        const res = await handleAuthProxyRequest({
            request: new Request(c.req.url, {
                headers: {
                    cookie: c.req.header("cookie") ?? "",
                    origin: c.req.header("origin") ?? new URL(c.req.url).origin,
                },
            }),
            path: "get-session",
            baseUrl: neon.baseUrl,
            cookieSecret: neon.cookieSecret,
        });
        for (const cookie of res.headers.getSetCookie())
            c.header("Set-Cookie", cookie, { append: true });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { user?: Person | null } | null;
        return data?.user ?? null;
    };

    const nameOf = (person: Person) => person.name || (person.email.split("@")[0] ?? person.email);
    const claim = (person: Person, handle: string) =>
        isReservedHandle(handle)
            ? Promise.resolve(false)
            : store.claimHandle(person.id, handle, starterPage(nameOf(person)));

    app.all(`${routes.auth}/*`, (c) => {
        if (!neon) return c.json({ code: "NOT_SET_UP", message: NOT_SET_UP }, 503);
        return handleAuthProxyRequest({
            request: c.req.raw,
            path: c.req.path.slice(routes.auth.length + 1),
            baseUrl: neon.baseUrl,
            cookieSecret: neon.cookieSecret,
        });
    });

    app.get(routes.me, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        return c.json<MeResponse>({
            email: person.email,
            name: nameOf(person),
            handle: await store.findHandle(person.id),
        });
    });

    app.post(routes.claim, async (c) => {
        // A form on another site can't send JSON without permission, which blocks cross-site posts.
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = claimRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) {
            return fail(c, 400, "Use 1 to 30 lowercase letters, numbers or hyphens.");
        }
        const { handle } = parsed.data;
        if (!(await claim(person, handle))) {
            return fail(c, 409, "That address is taken. Try another one.");
        }
        return c.json<MeResponse>({ email: person.email, name: nameOf(person), handle });
    });

    // Google returns here. The first visit swaps Neon's verifier for a session cookie and comes
    // back to this same address without it, and the second works out where the person goes next.
    app.get(routes.authReturn, async (c) => {
        const failed = `${siteUrl}/login?error=google-failed`;
        if (!neon) return c.redirect(`${siteUrl}/login?error=not-set-up`);
        const result = await processAuthMiddleware({
            request: c.req.raw,
            pathname: c.req.path,
            skipRoutes: [...DEFAULT_AUTH_SKIP_ROUTES, routes.authReturn],
            loginUrl: failed,
            baseUrl: neon.baseUrl,
            cookieSecret: neon.cookieSecret,
        });
        if (result.action === "redirect_login") return c.redirect(failed);
        for (const cookie of result.cookies ?? []) c.header("Set-Cookie", cookie, { append: true });
        if (result.action === "redirect_oauth") {
            const next = result.redirectUrl;
            return c.redirect(`${next.pathname}${next.search}`);
        }

        const person = await currentPerson(c);
        if (!person) return c.redirect(failed);
        if (await store.findHandle(person.id)) return c.redirect(editorUrl);
        const wanted = claimRequest.safeParse({ handle: c.req.query("handle") ?? "" });
        if (wanted.success && (await claim(person, wanted.data.handle))) {
            return c.redirect(editorUrl);
        }
        return c.redirect(`${siteUrl}/claim`);
    });
}
