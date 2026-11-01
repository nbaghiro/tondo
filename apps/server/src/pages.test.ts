import type { IssuesResponse, StatsResponse } from "@tondo/contract";
import { pageHash, samplePage, starterPage } from "@tondo/page";
import type { Page } from "@tondo/page";
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

describe("keeping a page under control", () => {
    const publish = async (call: ReturnType<typeof setup>["call"]) => {
        await call("june", "PUT", "/api/v1/me/page", { page: withButton, updatedAt: "1" });
        await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "2" });
    };

    it("takes a page down, and its address stops working", async () => {
        const { app, call } = setup();
        await publish(call);
        expect((await app.request("/june")).status).toBe(200);
        expect((await call("june", "POST", "/api/v1/me/page/unpublish")).status).toBe(204);
        expect((await app.request("/june")).status).toBe(404);
    });

    it("refuses a made-up timestamp, and a request from nowhere", async () => {
        const { call, app } = setup();
        const bad = await call("june", "POST", "/api/v1/me/page/publish", { updatedAt: "soon" });
        expect(bad.status).toBe(400);
        const res = await app.request("/api/v1/me/page/unpublish", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                origin: "null",
                cookie: cookieFor("june"),
            },
        });
        expect(res.status).toBe(403);
    });

    it("counts a real visit, but not a HEAD or a bot", async () => {
        const { app, call, pages } = setup();
        await publish(call);
        await app.request("/june", { method: "HEAD" });
        await app.request("/june", { headers: { "user-agent": "Googlebot/2.1" } });
        expect(pages.counts).toEqual([]);
        await app.request("/june", { headers: { "user-agent": "Mozilla/5.0" } });
        expect(pages.counts).toHaveLength(1);
    });

    it("gives a live page its share tags and a report link", async () => {
        const { app, call } = setup();
        await publish(call);
        const html = await (await app.request("/june")).text();
        expect(html).toContain('property="og:title"');
        expect(html).toContain("twitter:card");
        expect(html).toContain("/report?page=june");
    });

    it("tells a suspended owner, and refuses to publish", async () => {
        const { app, call, pages } = setup();
        pages.suspend("june");
        const draft = (await (await call("june", "GET", "/api/v1/me/page")).json()) as {
            suspended: boolean;
            updatedAt: string;
        };
        expect(draft.suspended).toBe(true);
        const check = (await (await call("june", "GET", "/api/v1/me/page/check")).json()) as {
            issues: { message: string }[];
        };
        expect(check.issues[0]?.message).toContain("taken down");
        const res = await call("june", "POST", "/api/v1/me/page/publish", {
            updatedAt: draft.updatedAt,
        });
        expect(res.status).toBe(422);
        expect((await app.request("/june")).status).toBe(404);
    });

    it("keeps a retry from being a conflict when an older lost save is what landed", async () => {
        const { call } = setup();
        const draft = (await (await call("june", "GET", "/api/v1/me/page")).json()) as {
            updatedAt: string;
        };
        const landed = starterPage("Landed");
        await call("june", "PUT", "/api/v1/me/page", {
            page: landed,
            updatedAt: draft.updatedAt,
        });
        const res = await call("june", "PUT", "/api/v1/me/page", {
            page: starterPage("Later"),
            updatedAt: draft.updatedAt,
            previous: ["somethingthatneverarrived", pageHash(landed)],
        });
        expect(res.status).toBe(200);
    });

    it("refuses oversized address changes and deletions", async () => {
        const { call } = setup();
        const huge = { handle: "x".repeat(10_000) };
        expect((await call("june", "PATCH", "/api/v1/me/handle", huge)).status).toBe(413);
        expect((await call("june", "DELETE", "/api/v1/me", huge)).status).toBe(413);
    });

    it("limits taking a page down and reading numbers", async () => {
        const { call } = setup();
        let last = 0;
        for (let i = 0; i < 25; i++) {
            last = (await call("june", "POST", "/api/v1/me/page/unpublish", {})).status;
        }
        expect(last).toBe(429);
    });

    it("adds up clicks on links that have since been replaced", async () => {
        const { app, call, pages } = setup();
        await publish(call);
        await app.request("/june", { headers: { "user-agent": "Mozilla/5.0" } });
        pages.counts.push({ pageId: "june", target: "gone" });
        const stats = (await (await call("june", "GET", "/api/v1/me/stats")).json()) as {
            clicks: number;
            links: unknown[];
            earlierClicks: number;
        };
        expect(stats.clicks).toBe(1);
        expect(stats.links).toEqual([]);
        expect(stats.earlierClicks).toBe(1);
    });
});

describe("publishing and plans", () => {
    const bake = (): Page => ({
        ...starterPage("June"),
        look: "bake",
        header: { ...starterPage("June").header, bio: "Hello" },
    });
    const setupWith = (page: Page) => {
        const made = setup();
        made.pages.setDraft("june", page);
        const post = (body: unknown) => made.call("june", "POST", "/api/v1/me/page/publish", body);
        const get = (path: string) => made.call("june", "GET", path);
        return { ...made, post, get };
    };
    const setupPlans = () => {
        vi.stubEnv("PLANS_ON", "true");
        return setupWith(bake());
    };
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("refuses a paid look on Free, and says it's about the plan", async () => {
        const { post } = setupPlans();
        const res = await post({ updatedAt: "1" });
        expect(res.status).toBe(422);
        const { issues } = (await res.json()) as IssuesResponse;
        expect(issues[0]).toMatchObject({
            plan: "look",
            message: expect.stringContaining("Bakehouse") as string,
        });
    });

    it("publishes free choices as a copy, leaving the draft alone", async () => {
        const { post, pages } = setupPlans();
        expect((await post({ updatedAt: "1", free: true })).status).toBe(204);
        expect((await pages.store.findOwnLive("june"))?.look).toBe("sap");
        expect((await pages.store.findDraft("june"))?.page.look).toBe("bake");
    });

    it("lets everything through while plans are off", async () => {
        const { post } = setupWith(bake());
        expect((await post({ updatedAt: "1" })).status).toBe(204);
    });

    it("clamps statistics to the plan, and says which range it used", async () => {
        const { get } = setupPlans();
        const body = (await (await get("/api/v1/me/stats?days=90")).json()) as StatsResponse;
        expect(body.range).toBe(7);
        expect(body.days).toHaveLength(7);
    });
});
