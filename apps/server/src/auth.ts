import { claimRequest, deleteAccountRequest, routes } from "@tondo/contract";
import type {
    DeleteAccountResponse,
    ErrorResponse,
    HandleResponse,
    MeResponse,
    SignOutResponse,
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
import { limitsOf, plansOn } from "./limits";
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
    /** Ends a person's plan when they delete their account. It goes first, so nobody keeps paying. */
    cancelBilling?: (userId: string) => Promise<void>;
    /** Removes a person's stored files when they delete their account. */
    removeFiles?: (userId: string) => Promise<void>;
    /** How long to wait for storage before saying so. */
    removeFilesWaitMs?: number;
}

export interface Person {
    id: string;
    email: string;
    name: string;
}

const NOT_SET_UP = "Sign-in isn't set up yet.";

// Everything Neon's sign-out expires, plus the signed cache the toolkit adds.
const SESSION_COOKIES = ["session_token", "session_data", "dont_remember", "local.session_data"];

const clearSession = (c: Context) => {
    for (const name of SESSION_COOKIES) {
        c.header(
            "Set-Cookie",
            `__Secure-neon-auth.${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
            { append: true },
        );
    }
};

const isSameOrigin = (c: Context) => {
    const origin = c.req.header("origin") ?? "";
    return URL.canParse(origin) && new URL(origin).host === c.req.header("host");
};

/** Neon couldn't say who this is, which isn't the same as them being logged out. */
export class AuthUnavailable extends Error {}

const SEND_PATHS =
    /^(sign-up\/email|sign-in\/email|email-otp\/send-verification-otp|email-otp\/request-password-reset|email-otp\/reset-password|email-otp\/verify-email|change-password)$/;
const MAX_AUTH_BODY = 64 * 1024;
const GUESS_DELAY_MS = 2000;

export type CurrentPerson = (c: Context) => Promise<Person | null>;

const REMOVE_FILES_WAIT_MS = 10_000;

async function beforeDeadline(work: Promise<void> | undefined, ms: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error("Storage took too long."));
        }, ms);
    });
    await Promise.race([work, late]).finally(() => {
        clearTimeout(timer);
    });
}

export function mountAuth(app: Hono, config: AuthConfig): CurrentPerson {
    const { store, siteUrl, editorUrl, neon } = config;

    const fail = (c: Context, status: 400 | 401 | 409 | 413 | 415 | 429 | 503, error: string) =>
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
        // Neon says this session is over, so the browser shouldn't keep offering it.
        if (!data?.user) clearSession(c);
        return data?.user ?? null;
    };

    const nameOf = (person: Person) => person.name || (person.email.split("@")[0] ?? person.email);
    // Everything the editor knows about this person, from one place.
    const meOf = async (person: Person): Promise<MeResponse> => {
        const account = await store.findPlan(person.id);
        return {
            email: person.email,
            name: nameOf(person),
            pages: await store.listPages(person.id),
            plan: account.plan,
            limits: limitsOf(account),
            endsAt: account.endsAt?.toISOString() ?? null,
            billing: plansOn(),
        };
    };
    const claim = (person: Person, handle: string, page?: Page) =>
        isReservedHandle(handle)
            ? Promise.resolve(false)
            : store.claimHandle(person.id, handle, page ?? starterPage(nameOf(person)));

    // Sending codes is limited by address and by the email it's aimed at, so nobody can flood an inbox.
    // Passwords differ: a limit on the email alone would let a stranger lock its owner out. So guesses
    // are counted by email and address together, and past a higher ceiling on the email they're only
    // slowed down, which keeps guessing from many addresses slow without ever refusing the owner.
    const scale = config.scale ?? ((max: number) => max);
    const allowIp = createLimiter(scale(30), 60_000);
    const allowEmail = createLimiter(scale(8), 15 * 60_000);
    const allowGuess = createLimiter(scale(8), 15 * 60_000);
    const unhurried = createLimiter(scale(30), 15 * 60_000);
    const tooMany = (c: Context) =>
        c.json({ code: "TOO_MANY", message: "Too many tries. Wait a little and try again." }, 429);
    const limitAuth: MiddlewareHandler = async (c, next) => {
        const path = c.req.path.slice(routes.auth.length + 1);
        if (c.req.method === "POST" && SEND_PATHS.test(path)) {
            const body = (await c.req.raw
                .clone()
                .json()
                .catch(() => null)) as { email?: unknown } | null;
            const email = typeof body?.email === "string" ? body.email.toLowerCase() : "";
            const ip = clientIp(c);
            if (!allowIp(`${path}|${ip}`)) return tooMany(c);
            if (email && path === "sign-in/email") {
                if (!allowGuess(`${email}|${ip}`)) return tooMany(c);
                if (!unhurried(email))
                    await new Promise((done) => setTimeout(done, GUESS_DELAY_MS));
            } else if (email && !allowEmail(`${path}|${email}`)) {
                return tooMany(c);
            }
        }
        await next();
        return undefined;
    };

    const smallBody = bodyLimit({
        maxSize: 4096,
        onError: (c) => fail(c, 413, "That's too long."),
    });
    const allowCheck = createLimiter(scale(60), 60_000);

    app.use(
        `${routes.auth}/*`,
        bodyLimit({
            maxSize: MAX_AUTH_BODY,
            onError: (c) => c.json({ code: "TOO_LARGE", message: "That's too long." }, 413),
        }),
        limitAuth,
    );

    // Leaving must work even if Neon doesn't answer, so our own page clears the cookies regardless
    // and says the session may outlive them. Another site's request is refused, not obeyed.
    app.post(routes.signOut, async (c) => {
        if (!neon) return c.json({ code: "NOT_SET_UP", message: NOT_SET_UP }, 503);
        const res = await handleAuthProxyRequest({
            request: c.req.raw,
            path: "sign-out",
            baseUrl: neon.baseUrl,
            cookieSecret: neon.cookieSecret,
        }).catch(() => null);
        if (res?.ok) {
            clearSession(c);
            return c.json<SignOutResponse>({ ended: true });
        }
        if (!isSameOrigin(c))
            return c.json({ code: "INVALID_ORIGIN", message: "Not allowed." }, 403);
        process.stderr.write(`Neon didn't end a session: ${String(res?.status)}\n`);
        clearSession(c);
        return c.json<SignOutResponse>({ ended: false }, 502);
    });

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
        c.header("Cache-Control", "no-store");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        return c.json<MeResponse>(await meOf(person));
    });

    app.get(routes.handleCheck(":handle").replace("%3A", ":"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowCheck(person.id))
            return fail(c, 429, "Too many tries. Wait a little and try again.");
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
            config.onHandleChange?.(null, handle);
            return c.json<MeResponse>(await meOf(person));
        },
    );

    // The plan goes first, then photos, because both can be tried again. If they can't be removed, the page and sign-in
    // stay too, so the person can still come back and finish. Once the page is gone, the sign-in is
    // always attempted, and the answer says exactly what went.
    app.delete(routes.me, smallBody, async (c) => {
        if (!c.req.header("content-type")?.startsWith("application/json")) {
            return fail(c, 415, "Send this as JSON.");
        }
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = deleteAccountRequest.safeParse(
            await c.req.json<unknown>().catch(() => null),
        );
        if (parsed.data?.email.trim().toLowerCase() !== person.email.toLowerCase()) {
            return fail(c, 400, "Type your email to confirm.");
        }
        const handles = (await store.listPages(person.id)).map((page) => page.handle);
        const stoppedAt = (error: unknown, what: string, photosRemoved: boolean) => {
            process.stderr.write(`Couldn't delete ${what}: ${String(error)}\n`);
            return c.json(
                {
                    error: `We couldn't remove your ${what}, so your account is still here. Please try again.`,
                    photosRemoved,
                    pageRemoved: false,
                    signInRemoved: false,
                },
                503,
            );
        };
        try {
            await config.cancelBilling?.(person.id);
        } catch (error) {
            process.stderr.write(`Couldn't cancel a plan: ${String(error)}\n`);
            return c.json(
                {
                    error: "We couldn't cancel your plan, so your account is still here. Please try again.",
                    photosRemoved: false,
                    pageRemoved: false,
                    signInRemoved: false,
                },
                503,
            );
        }
        try {
            await beforeDeadline(
                config.removeFiles?.(person.id),
                config.removeFilesWaitMs ?? REMOVE_FILES_WAIT_MS,
            );
        } catch (error) {
            return stoppedAt(error, "photos", false);
        }
        try {
            await store.removeUser(person.id);
        } catch (error) {
            return stoppedAt(error, "page", true);
        }
        for (const handle of handles) config.onHandleChange?.(handle, null);
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
                      if (res.ok) clearSession(c);
                      return res.ok;
                  })
                  .catch(() => false)
            : false;
        return c.json<DeleteAccountResponse>({
            photosRemoved: true,
            pageRemoved: true,
            signInRemoved: removed,
        });
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
        if ((await store.listPages(person.id)).length) return c.redirect(editorUrl);
        // A new person goes through the start flow, with the address they asked for ready to check.
        const wanted = normaliseHandle(c.req.query("handle") ?? "");
        const usable = isValidHandle(wanted) && !isReservedHandle(wanted);
        return c.redirect(usable ? `${editorUrl}?handle=${encodeURIComponent(wanted)}` : editorUrl);
    });

    return currentPerson;
}
