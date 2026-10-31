import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import type { AuthConfig } from "./auth";
import { createFakeStore } from "./fake-store";

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

function setup(extra: Partial<AuthConfig> = {}) {
    return createApp({
        findPage: () => Promise.resolve(null),
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

    it("reads the person from Neon's session, with their address from our tables", async () => {
        fakeNeon(sessionFor);
        const app = setup();
        const headers = { cookie: SESSION };
        expect(await (await app.request("/api/v1/me", { headers })).json()).toEqual({
            email: june.email,
            name: june.name,
            handle: null,
        });
        await app.request("/api/v1/me/handle", postJson({ handle: "june" }, SESSION));
        const after = (await (await app.request("/api/v1/me", { headers })).json()) as object;
        expect(after).toMatchObject({ handle: "june" });
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
        await store.claimHandle("someone-else", "rae", {
            look: "madder",
            header: { name: "", tagline: "", bio: "", photo: "", social: [] },
            blocks: [],
        });
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

    it("claims the chosen address and opens the editor", async () => {
        fakeNeon(sessionFor);
        const res = await back(setup(), "?handle=june");
        expect(res.headers.get("location")).toBe("http://editor");
    });

    it("asks for an address when none was chosen, or it was taken", async () => {
        fakeNeon(sessionFor);
        expect((await back(setup())).headers.get("location")).toBe("http://site/claim");
        expect((await back(setup(), "?handle=login")).headers.get("location")).toBe(
            "http://site/claim",
        );
    });

    it("opens the editor for someone who already has an address", async () => {
        fakeNeon(sessionFor);
        const app = setup();
        await app.request("/api/v1/me/handle", postJson({ handle: "june" }, SESSION));
        expect((await back(app)).headers.get("location")).toBe("http://editor");
    });
});
