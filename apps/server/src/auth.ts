import { changeHandleRequest, claimRequest, routes } from "@tondo/contract";
import type {
    DeleteAccountResponse,
    ErrorResponse,
    HandleResponse,
    MeResponse,
} from "@tondo/contract";
import type { AccountStore } from "@tondo/db";
import {
    handleSchema,
    isReservedHandle,
    isValidHandle,
    normaliseHandle,
    starterPage,
} from "@tondo/page";
import type { Page } from "@tondo/page";
import {
    DEFAULT_AUTH_SKIP_ROUTES,
    handleAuthProxyRequest,
    processAuthMiddleware,
} from "@neon/auth/server";
import type { Context, Hono, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { clientIp, createLimiter } from "./traffic";
import type { Scale } from "./traffic";

export interface AuthConfig {
    store: AccountStore;
    siteUrl: string;
    editorUrl: string;
    /** Multiplies the rate limits. Tests share one address, so they raise it. */
    scale?: Scale;
    /** Without this, the site still runs and sign-in explains that it isn't set up. */
    neon?: { baseUrl: string; cookieSecret: string } | undefined;
    /** Told when an address changes or goes away, so nothing old keeps being served. */
    onHandleChange?: (before: string | null, after: string | null) => void;
    /** Removes a person's stored files when they delete their account. */
    removeFiles?: (userId: string) => Promise<void>;
}

export interface Person {
    id: string;
    email: string;
    name: string;
}

const NOT_SET_UP = "Sign-in isn't set up yet.";

/** Neon couldn't say who this is, which isn't the same as them being logged out. */
export class AuthUnavailable extends Error {}

const SEND_PATHS =
    /^(sign-up\/email|sign-in\/email|email-otp\/send-verification-otp|email-otp\/request-password-reset|email-otp\/reset-password|email-otp\/verify-email|change-password)$/;
const MAX_AUTH_BODY = 64 * 1024;

export type CurrentPerson = (c: Context) => Promise<Person | null>;

export function mountAuth(app: Hono, config: AuthConfig): CurrentPerson {
    const { store, siteUrl, editorUrl, neon } = config;

    const fail = (c: Context, status: 400 | 401 | 409 | 413 | 415 | 503, error: string) =>
        c.json<ErrorResponse>({ error }, status);

    // Neon's toolkit caches the session in a signed cookie, so most requests don't reach Neon.
    const currentPerson: CurrentPerson = async (c) => {
        if (!neon) return null;
        const cookies = c.req.header("cookie") ?? "";
        // Nobody signed in carries no session cookie, so there's no reason to ask Neon.
        if (!cookies.includes("neon-auth")) return null;
        const res = await handleAuthProxyRequest({
            request: new Request(c.req.url, {
                headers: {
                    cookie: cookies,
                    origin: c.req.header("origin") ?? new URL(c.req.url).origin,
                },
            }),
            path: "get-session",
            baseUrl: neon.baseUrl,
            cookieSecret: neon.cookieSecret,
        }).catch((error: unknown) => {
            throw new AuthUnavailable(String(error));
        });
        if (res.status >= 500) throw new AuthUnavailable(`Neon answered ${String(res.status)}`);
        for (const cookie of res.headers.getSetCookie())
            c.header("Set-Cookie", cookie, { append: true });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { user?: Person | null } | null;
        return data?.user ?? null;
    };

    const nameOf = (person: Person) => person.name || (person.email.split("@")[0] ?? person.email);
    const claim = (person: Person, handle: string, page?: Page) =>
        isReservedHandle(handle)
            ? Promise.resolve(false)
            : store.claimHandle(person.id, handle, page ?? starterPage(nameOf(person)));

    // Sending codes and trying passwords are limited by address, and by the email they're aimed at, so
    // nobody can flood someone's inbox or guess at one account from many places.
    const scale = config.scale ?? ((max: number) => max);
    const allowIp = createLimiter(scale(30), 60_000);
    const allowEmail = createLimiter(scale(8), 15 * 60_000);
    const limitAuth: MiddlewareHandler = async (c, next) => {
        const path = c.req.path.slice(routes.auth.length + 1);
        if (c.req.method === "POST" && SEND_PATHS.test(path)) {
            const body = (await c.req.raw
                .clone()
                .json()
                .catch(() => null)) as { email?: unknown } | null;
            const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";
            const over =
                !allowIp(`${path}|${clientIp(c)}`) || (email && !allowEmail(`${path}|${email}`));
            if (over) {
                return c.json(
                    { code: "TOO_MANY", message: "Too many tries. Wait a little and try again." },
                    429,
                );
            }
        }
        await next();
        return undefined;
    };

    app.use(
        `${routes.auth}/*`,
        bodyLimit({
            maxSize: MAX_AUTH_BODY,
            onError: (c) => c.json({ code: "TOO_LARGE", message: "That's too long." }, 413),
        }),
        limitAuth,
    );

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

    app.get(routes.handleCheck(":handle").replace("%3A", ":"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const handle = normaliseHandle(c.req.param("handle") ?? "");
        const free = { available: true, message: "That address is free." };
        const taken = { available: false, message: "That address is taken. Try another one." };
        if (!handleSchema.safeParse(handle).success) {
            return c.json<HandleResponse>(
                isReservedHandle(handle)
                    ? taken
                    : {
                          available: false,
                          message: "Use 1 to 30 lowercase letters, numbers or hyphens.",
                      },
            );
        }
        return c.json<HandleResponse>((await store.handleTaken(handle)) ? taken : free);
    });

    app.post(
        routes.claim,
        bodyLimit({
            maxSize: 1024 * 1024,
            onError: (c) => fail(c, 413, "This page is too large to save."),
        }),
        async (c) => {
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
            if (!(await claim(person, handle, parsed.data.page))) {
                return fail(c, 409, "That address is taken. Try another one.");
            }
            return c.json<MeResponse>({ email: person.email, name: nameOf(person), handle });
        },
    );

    app.patch(routes.claim, async (c) => {
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = changeHandleRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) {
            return fail(c, 400, "Use 1 to 30 lowercase letters, numbers or hyphens.");
        }
        const { handle } = parsed.data;
        const before = await store.findHandle(person.id);
        if (!(await store.changeHandle(person.id, handle))) {
            return fail(c, 409, "That address is taken. Try another one.");
        }
        config.onHandleChange?.(before, handle);
        return c.json<MeResponse>({ email: person.email, name: nameOf(person), handle });
    });

    app.delete(routes.me, async (c) => {
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const handle = await store.findHandle(person.id);
        const parsed = (await c.req.json<unknown>().catch(() => null)) as {
            handle?: unknown;
        } | null;
        if (handle && parsed?.handle !== handle) {
            return fail(c, 400, "Type your address to confirm.");
        }
        await store.removeUser(person.id);
        config.onHandleChange?.(handle, null);
        await config.removeFiles?.(person.id);
        // Neon only allows this if deleting users is switched on, so the answer says how it went.
        const removed = neon
            ? await handleAuthProxyRequest({
                  request: new Request(new URL(`${routes.auth}/delete-user`, c.req.url), {
                      method: "POST",
                      headers: {
                          "content-type": "application/json",
                          cookie: c.req.header("cookie") ?? "",
                          origin: c.req.header("origin") ?? new URL(c.req.url).origin,
                      },
                      body: "{}",
                  }),
                  path: "delete-user",
                  baseUrl: neon.baseUrl,
                  cookieSecret: neon.cookieSecret,
              })
                  .then((res) => {
                      for (const cookie of res.headers.getSetCookie())
                          c.header("Set-Cookie", cookie, { append: true });
                      return res.ok;
                  })
                  .catch(() => false)
            : false;
        return c.json<DeleteAccountResponse>({ signInRemoved: removed });
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
        // A new person goes through the start flow, with the address they asked for ready to check.
        const wanted = normaliseHandle(c.req.query("handle") ?? "");
        const usable = isValidHandle(wanted) && !isReservedHandle(wanted);
        return c.redirect(usable ? `${editorUrl}?handle=${encodeURIComponent(wanted)}` : editorUrl);
    });

    return currentPerson;
}
