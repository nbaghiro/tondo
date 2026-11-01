import { samplePage, starterPage } from "@tondo/page";
import { linkId } from "@tondo/render";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { createFakePages, createFakeStore } from "./fake-store";

const neon = {
    baseUrl: "https://ep-test.neonauth.example.com/neondb/auth",
    cookieSecret: "a-test-secret-that-is-long-enough-to-use",
};
const stamp = "2026-01-01T00:00:00.000Z";
const person = (id: string, token: string) => ({
    session: {
        id: token,
        token,
        userId: id,
        expiresAt: "2099-01-01T00:00:00.000Z",
        createdAt: stamp,
        updatedAt: stamp,
    },
    user: {
        id,
        email: `${id}@example.com`,
        name: id,
        emailVerified: true,
        createdAt: stamp,
        updatedAt: stamp,
    },
});
const cookieFor = (token: string) => `__Secure-neon-auth.session_token=${token}`;

function setup() {
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => {
        const cookie = new Headers(init?.headers).get("cookie") ?? "";
        if (cookie.includes("=june")) return Promise.resolve(Response.json(person("june", "june")));
        if (cookie.includes("=rae")) return Promise.resolve(Response.json(person("rae", "rae")));
        return Promise.resolve(Response.json(null));
    });
    const pages = createFakePages({ sample: samplePage });
    pages.addUser("june", "june", starterPage("June"));
    pages.addUser("rae", "rae", starterPage("Rae"));
    const app = createApp({
        pages: pages.store,
        auth: { store: createFakeStore(), siteUrl: "http://site", editorUrl: "http://e", neon },
    });
    const call = (token: string, method: string, path: string, body?: unknown) =>
        app.request(path, {
            method,
            headers: { "content-type": "application/json", cookie: cookieFor(token) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
    return { app, call, pages };
}

const button = {
    id: "b1",
    type: "button" as const,
    variant: "filled" as const,
    text: "Shop",
    url: "https://shop.example.com/?a=1&b=2",
};
const withButton = { ...starterPage("June"), blocks: [button] };

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("drafts", () => {
    it("needs a session", async () => {
        const { call } = setup();
        expect((await call("nobody", "GET", "/api/v1/me/page")).status).toBe(401);
        expect(
            (await call("nobody", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "1" }))
                .status,
        ).toBe(401);
        expect(
            (await call("nobody", "POST", "/api/v1/me/page/publish", { updatedAt: "1" })).status,
        ).toBe(401);
    });

    it("only ever touches the signed-in person's own page", async () => {
        const { call } = setup();
        await call("june", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "1" });
        const rae = (await (await call("rae", "GET", "/api/v1/me/page")).json()) as {
            page: { blocks: unknown[] };
        };
        expect(rae.page.blocks).toEqual([]);
    });

    it("refuses a stale save, invalid pages, and oversized bodies", async () => {
        const { call, app } = setup();
        const saved = await call("june", "PUT", "/api/v1/me/page", {
            page: withButton,
            updatedAt: "1",
        });
        expect(saved.status).toBe(200);
        const stale = await call("june", "PUT", "/api/v1/me/page", {
            page: withButton,
            updatedAt: "1",
        });
        expect(stale.status).toBe(409);
        const bad = await call("june", "PUT", "/api/v1/me/page", {
            page: { ...withButton, look: "nope" },
            updatedAt: "2",
        });
        expect(bad.status).toBe(400);
        const script = await call("june", "PUT", "/api/v1/me/page", {
            page: { ...withButton, blocks: [{ ...button, url: "javascript:alert(1)" }] },
            updatedAt: "2",
        });
        expect(script.status).toBe(400);
        const huge = await app.request("/api/v1/me/page", {
            method: "PUT",
            headers: { "content-type": "application/json", cookie: cookieFor("june") },
            body: "x".repeat(1024 * 1024 + 1),
        });
        expect(huge.status).toBe(413);
    });

    it("refuses anything but JSON", async () => {
        const { app } = setup();
        const res = await app.request("/api/v1/me/page/publish", {
            method: "POST",
            headers: { "content-type": "text/plain", cookie: cookieFor("june") },
            body: "{}",
        });
        expect(res.status).toBe(415);
    });
});

describe("publishing and links", () => {
    it("lists what to fix, then publishes", async () => {
        const { call, app } = setup();
        const empty = await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "1" });
        expect(empty.status).toBe(422);
        expect((await app.request("/june")).status).toBe(404);

        await call("june", "PUT", "/api/v1/me/page", {
            page: { ...withButton, blocks: [{ ...button, url: "" }] },
            updatedAt: "1",
        });
        const noLink = await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "2" });
        expect(((await noLink.json()) as { issues: { target: string }[] }).issues[0]?.target).toBe(
            "b1",
        );

        await call("june", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "2" });
        expect(
            (await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "3" })).status,
        ).toBe(204);
        const live = await app.request("/june");
        expect(live.status).toBe(200);
        expect(await live.text()).toContain(`/l/june/${linkId(button.url)}`);
    });

    it("redirects only to links on the live page, and counts them", async () => {
        const { call, app, pages } = setup();
        await call("june", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "1" });
        await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "2" });
        const res = await app.request(`/l/june/${linkId(button.url)}`);
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe(button.url);
        expect(pages.counts).toEqual([{ pageId: "june", target: linkId(button.url) }]);
        const forged = encodeURIComponent("https://evil.example.com");
        expect((await app.request(`/l/june/${forged}`)).status).toBe(404);
        expect((await app.request(`/l/june/${linkId("https://evil.example.com")}`)).status).toBe(
            404,
        );
        expect((await app.request(`/l/nobody/${linkId(button.url)}`)).status).toBe(404);
    });

    it("doesn't serve a draft through the redirect", async () => {
        const { call, app } = setup();
        await call("june", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "1" });
        expect((await app.request(`/l/june/${linkId(button.url)}`)).status).toBe(404);
    });
});
