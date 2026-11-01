import { starterPage } from "@tondo/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import type { AuthConfig } from "./auth";
import { createFakePages, createFakeStore } from "./fake-store";
import type { Storage } from "./storage";
import type { Payments } from "./stripe";

// This runs Neon's real toolkit, and replaces only the network call it makes to Neon.
const neon = {
    baseUrl: "https://ep-test.neonauth.example.com/neondb/auth",
    cookieSecret: "a-test-secret-that-is-long-enough-to-use",
};
const SESSION = "__Secure-neon-auth.session_token=token";
const june = { id: "user-1", email: "june@example.com", name: "June Aster" };
const session = {
    session: {
        id: "s1",
        token: "token",
        userId: june.id,
        expiresAt: "2099-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
    user: {
        ...june,
        emailVerified: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    },
};

function fakeNeon(respond: (url: string, init?: RequestInit) => Response) {
    const calls: { url: string; init?: RequestInit | undefined }[] = [];
    vi.stubGlobal("fetch", (input: string, init?: RequestInit) => {
        calls.push({ url: input, init });
        return Promise.resolve(respond(input, init));
    });
    return calls;
}

const brokenStorage: Storage = {
    list: () => Promise.reject(new Error("storage is down")),
    put: () => Promise.reject(new Error("storage is down")),
    get: () => Promise.reject(new Error("storage is down")),
    remove: () => Promise.reject(new Error("storage is down")),
};

function setup(extra: Partial<AuthConfig> = {}) {
    return createApp({
        pages: createFakePages().store,
        auth: {
            store: createFakeStore(),
            siteUrl: "http://site",
            editorUrl: "http://editor",
            neon,
            ...extra,
        },
    });
}

const sessionFor = (url: string, init?: RequestInit) => {
    const cookie = new Headers(init?.headers).get("cookie") ?? "";
    return url.includes("get-session")
        ? Response.json(cookie.includes("session_token") ? session : null)
        : Response.json({});
};

const postJson = (body: unknown, cookie = "") => ({
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("without Neon set up", () => {
    const app = setup({ neon: undefined });

    it("explains on sign-in, and treats everyone as logged out", async () => {
        const res = await app.request("/api/auth/sign-in/email", postJson({}));
        expect(res.status).toBe(503);
        expect(await res.json()).toMatchObject({ code: "NOT_SET_UP" });
        expect((await app.request("/api/v1/me")).status).toBe(401);
    });

    it("sends a returning visitor back to log in", async () => {
        const res = await app.request("/api/v1/auth/return");
        expect(res.headers.get("location")).toBe("http://site/login?error=not-set-up");
    });
});

describe("the proxy to Neon", () => {
    it("forwards sign-in with its body and Origin, and passes the cookie back", async () => {
        const calls = fakeNeon(() =>
            Response.json(
                { user: june },
                {
                    headers: {
                        "set-cookie": `${SESSION}; Path=/; HttpOnly; Secure; SameSite=None`,
                    },
                },
            ),
        );
        const res = await setup().request("/api/auth/sign-in/email", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://site" },
            body: JSON.stringify({ email: june.email, password: "secret" }),
        });
        expect(res.status).toBe(200);
        const call = calls[0];
        expect(call?.url).toBe(`${neon.baseUrl}/sign-in/email`);
        expect(call?.init?.body).toContain(june.email);
        expect(new Headers(call?.init?.headers).get("origin")).toBe("http://site");
        expect(res.headers.getSetCookie().join()).toContain("session_token=token");
    });

    it("passes Neon's refusal on unchanged", async () => {
        fakeNeon(() =>
            Response.json({ code: "INVALID_EMAIL_OR_PASSWORD", message: "No" }, { status: 401 }),
        );
        const res = await setup().request("/api/auth/sign-in/email", postJson({}));
        expect(res.status).toBe(401);
        expect(await res.json()).toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });
    });
});

describe("who's logged in", () => {
    it("is nobody without a session", async () => {
        fakeNeon(sessionFor);
        expect((await setup().request("/api/v1/me")).status).toBe(401);
    });

    it("says the service is down when Neon is, rather than logging people out", async () => {
        fakeNeon(() => new Response("down", { status: 502 }));
        const res = await setup().request("/api/v1/me", { headers: { cookie: SESSION } });
        expect(res.status).toBe(503);
    });

    it("reads the person from Neon's session, with their address from our tables", async () => {
        fakeNeon(sessionFor);
        const app = setup();
        const headers = { cookie: SESSION };
        expect(await (await app.request("/api/v1/me", { headers })).json()).toMatchObject({
            email: june.email,
            name: june.name,
            pages: [],
        });
        await app.request("/api/v1/me/handle", postJson({ handle: "june" }, SESSION));
        const after = (await (await app.request("/api/v1/me", { headers })).json()) as object;
        expect(after).toMatchObject({ pages: [{ handle: "june" }] });
    });
});

describe("claiming an address", () => {
    it("needs a session and JSON", async () => {
        fakeNeon(sessionFor);
        const app = setup();
        expect((await app.request("/api/v1/me/handle", postJson({ handle: "june" }))).status).toBe(
            401,
        );
        const form = await app.request("/api/v1/me/handle", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded", cookie: SESSION },
            body: "handle=june",
        });
        expect(form.status).toBe(415);
    });

    it("refuses taken, reserved and invalid addresses", async () => {
        fakeNeon(sessionFor);
        const store = createFakeStore();
        await store.claimHandle("someone-else", "rae", starterPage("Rae"));
        const app = setup({ store });
        const post = (handle: string) =>
            app.request("/api/v1/me/handle", postJson({ handle }, SESSION));
        expect((await post("rae")).status).toBe(409);
        expect((await post("login")).status).toBeGreaterThanOrEqual(400);
        expect((await post("Bad_Name")).status).toBe(400);
        expect((await post("June")).status).toBe(200);
    });
});

describe("coming back from Google", () => {
    const back = (app: ReturnType<typeof setup>, query = "", cookie = SESSION) =>
        app.request(`http://site/api/v1/auth/return${query}`, { headers: { cookie } });

    it("sends someone with no session to log in, with a message", async () => {
        fakeNeon(sessionFor);
        const res = await back(setup(), "", "");
        expect(res.headers.get("location")).toBe("http://site/login?error=google-failed");
    });

    it("swaps the verifier for a session and returns to the same address without it", async () => {
        fakeNeon(() =>
            Response.json(session, {
                headers: { "set-cookie": `${SESSION}; Path=/; HttpOnly; Secure; SameSite=None` },
            }),
        );
        const res = await back(
            setup(),
            "?handle=june&neon_auth_session_verifier=v",
            "__Secure-neon-auth.session_challenge=c",
        );
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/api/v1/auth/return?handle=june");
        expect(res.headers.getSetCookie().join()).toContain("session_token");
    });

    it("carries the chosen address to the start flow, without claiming it", async () => {
        fakeNeon(sessionFor);
        const res = await back(setup(), "?handle=june");
        expect(res.headers.get("location")).toBe("http://editor?handle=june");
    });

    it("drops an address that can't be used", async () => {
        fakeNeon(sessionFor);
        expect((await back(setup())).headers.get("location")).toBe("http://editor");
        expect((await back(setup(), "?handle=login")).headers.get("location")).toBe(
            "http://editor",
        );
    });

    it("opens the editor for someone who already has an address", async () => {
        fakeNeon(sessionFor);
        const app = setup();
        await app.request("/api/v1/me/handle", postJson({ handle: "june" }, SESSION));
        expect((await back(app)).headers.get("location")).toBe("http://editor");
    });
});

describe("the limits on sign-in", () => {
    it("slows down repeated sends for one email", async () => {
        fakeNeon(() => Response.json({}));
        const app = setup();
        const statuses: number[] = [];
        for (let tries = 0; tries < 40; tries++) {
            const res = await app.request(
                "/api/auth/sign-in/email",
                postJson({ email: "june@example.com", password: "x" }),
            );
            statuses.push(res.status);
        }
        expect(statuses[0]).toBe(200);
        expect(statuses).toContain(429);
    });

    it("doesn't let a stranger lock the owner out of their password", async () => {
        fakeNeon(() => Response.json({ code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 }));
        const app = setup();
        const signIn = (ip: string) =>
            app.request("/api/auth/sign-in/email", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-forwarded-for": ip,
                },
                body: JSON.stringify({ email: "owner@example.com", password: "wrong" }),
            });
        vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
        for (let i = 0; i < 9; i++) await signIn("6.6.6.6");
        expect((await signIn("6.6.6.6")).status).toBe(429);
        expect((await signIn("7.7.7.7")).status).toBe(401);
        vi.unstubAllEnvs();
    });

    const cleared = (res: Response) =>
        res.headers
            .getSetCookie()
            .filter((cookie) => cookie.includes("Max-Age=0") && cookie.includes("Secure"))
            .map((cookie) => cookie.split("=")[0]);
    const signOut = (origin: string) => ({
        method: "POST",
        headers: { "content-type": "application/json", cookie: SESSION, host: "site", origin },
        body: "{}",
    });

    it("clears both cookies when Neon ends the session", async () => {
        fakeNeon(() => Response.json({ success: true }));
        const res = await setup().request("http://site/api/auth/sign-out", signOut("http://site"));
        expect(await res.json()).toEqual({ ended: true });
        expect(cleared(res)).toEqual(
            expect.arrayContaining([
                "__Secure-neon-auth.session_token",
                "__Secure-neon-auth.local.session_data",
            ]),
        );
    });

    it.each([
        ["answers an error", () => new Response("no", { status: 500 })],
        [
            "can't be reached",
            () => {
                throw new TypeError("fetch failed");
            },
        ],
    ])("clears the cookies and says so when Neon %s", async (_, answer) => {
        fakeNeon(answer);
        const res = await setup().request("http://site/api/auth/sign-out", signOut("http://site"));
        expect(res.status).toBe(502);
        expect(await res.json()).toEqual({ ended: false });
        expect(cleared(res)).toContain("__Secure-neon-auth.session_token");
    });

    it("won't log someone out for another site", async () => {
        fakeNeon(() => Response.json({ code: "INVALID_ORIGIN" }, { status: 403 }));
        const res = await setup().request("http://site/api/auth/sign-out", signOut("https://evil"));
        expect(res.status).toBe(403);
        expect(res.headers.getSetCookie()).toEqual([]);
    });

    it("clears a session Neon no longer knows", async () => {
        fakeNeon(() => Response.json(null));
        const res = await setup().request("/api/v1/me", { headers: { cookie: SESSION } });
        expect(res.status).toBe(401);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(cleared(res)).toContain("__Secure-neon-auth.local.session_data");
    });

    it("keeps the account when photos can't be removed, and says what happened", async () => {
        const calls = fakeNeon(() => Response.json(session));
        const store = createFakeStore();
        await store.claimHandle(june.id, "june", starterPage("June"));
        const app = createApp({
            pages: createFakePages().store,
            storage: brokenStorage,
            auth: { store, siteUrl: "http://site", editorUrl: "http://editor", neon },
        });
        const res = await app.request("/api/v1/me", {
            method: "DELETE",
            headers: { "content-type": "application/json", cookie: SESSION },
            body: JSON.stringify({ email: june.email }),
        });
        expect(res.status).toBe(503);
        expect(await res.json()).toMatchObject({ pageRemoved: false, signInRemoved: false });
        expect((await store.listPages(june.id)).map((page) => page.handle)).toEqual(["june"]);
        expect(calls.some((call) => call.url.includes("delete-user"))).toBe(false);
    });

    it("stops waiting for storage that never answers", async () => {
        fakeNeon(() => Response.json(session));
        const store = createFakeStore();
        await store.claimHandle(june.id, "june", starterPage("June"));
        const app = createApp({
            pages: createFakePages().store,
            storage: { ...brokenStorage, list: () => new Promise(() => undefined) },
            auth: {
                store,
                siteUrl: "http://site",
                editorUrl: "http://editor",
                neon,
                removeFilesWaitMs: 5,
            },
        });
        const res = await app.request("/api/v1/me", {
            method: "DELETE",
            headers: { "content-type": "application/json", cookie: SESSION },
            body: JSON.stringify({ email: june.email }),
        });
        expect(res.status).toBe(503);
        expect((await store.listPages(june.id)).map((page) => page.handle)).toEqual(["june"]);
    });

    it("keeps a suspended address out of use after the account is deleted", async () => {
        fakeNeon(() => Response.json(session));
        const store = createFakeStore();
        await store.claimHandle(june.id, "june", starterPage("June"));
        store.suspend(june.id);
        const app = setup({ store });
        const res = await app.request("/api/v1/me", {
            method: "DELETE",
            headers: { "content-type": "application/json", cookie: SESSION },
            body: JSON.stringify({ email: june.email }),
        });
        expect(res.status).toBe(200);
        expect(await store.handleTaken("june")).toBe(true);
    });
});

describe("deleting an account with a plan", () => {
    const COOKIE = "__Secure-neon-auth.session_token=abc";
    const payments = (deleteCustomer: Payments["deleteCustomer"]): Payments => ({
        createCustomer: () => Promise.resolve("cus_1"),
        checkoutUrl: () => Promise.resolve(""),
        portalUrl: () => Promise.resolve(""),
        subscriptions: () => Promise.resolve([]),
        deleteCustomer,
        readEvent: () => ({ kind: "ignore" }),
        checkPrices: () => Promise.resolve(),
    });
    const remove = async (deleteCustomer: Payments["deleteCustomer"]) => {
        fakeNeon(sessionFor);
        const store = createFakeStore();
        await store.claimHandle(session.user.id, "june", starterPage("June"));
        store.customers.set(session.user.id, "cus_1");
        const app = createApp({
            pages: createFakePages().store,
            payments: payments(deleteCustomer),
            auth: { store, siteUrl: "http://site", editorUrl: "http://editor", neon },
        });
        const res = await app.request("/api/v1/me", {
            method: "DELETE",
            headers: { "content-type": "application/json", cookie: COOKIE },
            body: JSON.stringify({ email: session.user.email }),
        });
        return { res, store };
    };

    it("cancels first, then removes everything", async () => {
        const seen: string[] = [];
        const { res, store } = await remove((customer) => {
            seen.push(customer);
            return Promise.resolve();
        });
        expect(res.status).toBe(200);
        expect(seen).toEqual(["cus_1"]);
        expect(await store.listPages(session.user.id)).toEqual([]);
    });

    it("keeps everything if Stripe can't be reached", async () => {
        const { res, store } = await remove(() => Promise.reject(new Error("down")));
        expect(res.status).toBe(503);
        expect(((await res.json()) as { error: string }).error).toContain(
            "couldn't cancel your plan",
        );
        expect((await store.listPages(session.user.id)).map((page) => page.handle)).toEqual([
            "june",
        ]);
    });
});
