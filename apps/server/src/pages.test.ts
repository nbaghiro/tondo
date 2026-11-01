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
        expect((await call("nobody", "GET", "/api/v1/me/pages/june")).status).toBe(401);
        expect(
            (
                await call("nobody", "PUT", "/api/v1/me/pages/june", {
                    page: withButton,
                    updatedAt: "1",
                })
            ).status,
        ).toBe(401);
        expect(
            (await call("nobody", "POST", "/api/v1/me/pages/june/publish", { updatedAt: "1" }))
                .status,
        ).toBe(401);
    });

    it("only ever touches the signed-in person's own page", async () => {
        const { call } = setup();
        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "1" });
        const rae = (await (await call("rae", "GET", "/api/v1/me/pages/rae")).json()) as {
            page: { blocks: unknown[] };
        };
        expect(rae.page.blocks).toEqual([]);
    });

    it("refuses a stale save, invalid pages, and oversized bodies", async () => {
        const { call, app } = setup();
        const saved = await call("june", "PUT", "/api/v1/me/pages/june", {
            page: withButton,
            updatedAt: "1",
        });
        expect(saved.status).toBe(200);
        const stale = await call("june", "PUT", "/api/v1/me/pages/june", {
            page: withButton,
            updatedAt: "1",
        });
        expect(stale.status).toBe(409);
        const bad = await call("june", "PUT", "/api/v1/me/pages/june", {
            page: { ...withButton, look: "nope" },
            updatedAt: "2",
        });
        expect(bad.status).toBe(400);
        const script = await call("june", "PUT", "/api/v1/me/pages/june", {
            page: { ...withButton, blocks: [{ ...button, url: "javascript:alert(1)" }] },
            updatedAt: "2",
        });
        expect(script.status).toBe(400);
        const huge = await app.request("/api/v1/me/pages/june", {
            method: "PUT",
            headers: { "content-type": "application/json", cookie: cookieFor("june") },
            body: "x".repeat(1024 * 1024 + 1),
        });
        expect(huge.status).toBe(413);
    });

    it("refuses anything but JSON", async () => {
        const { app } = setup();
        const res = await app.request("/api/v1/me/pages/june/publish", {
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
        const empty = await call("june", "POST", "/api/v1/me/pages/june/publish", {
            updatedAt: "1",
        });
        expect(empty.status).toBe(422);
        expect((await app.request("/june")).status).toBe(404);

        await call("june", "PUT", "/api/v1/me/pages/june", {
            page: { ...withButton, blocks: [{ ...button, url: "" }] },
            updatedAt: "1",
        });
        const noLink = await call("june", "POST", "/api/v1/me/pages/june/publish", {
            updatedAt: "2",
        });
        expect(((await noLink.json()) as { issues: { target: string }[] }).issues[0]?.target).toBe(
            "b1",
        );

        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "2" });
        expect(
            (await call("june", "POST", "/api/v1/me/pages/june/publish", { updatedAt: "3" }))
                .status,
        ).toBe(204);
        const live = await app.request("/june");
        expect(live.status).toBe(200);
        expect(await live.text()).toContain(`/l/june/${linkId(button.url)}`);
    });

    it("redirects only to links on the live page, and counts them", async () => {
        const { call, app, pages } = setup();
        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "1" });
        await call("june", "POST", "/api/v1/me/pages/june/publish", { updatedAt: "2" });
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
        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "1" });
        expect((await app.request(`/l/june/${linkId(button.url)}`)).status).toBe(404);
    });
});

describe("keeping a page under control", () => {
    const publish = async (call: ReturnType<typeof setup>["call"]) => {
        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "1" });
        await call("june", "POST", "/api/v1/me/pages/june/publish", { updatedAt: "2" });
    };

    it("takes a page down, and its address stops working", async () => {
        const { app, call } = setup();
        await publish(call);
        expect((await app.request("/june")).status).toBe(200);
        expect((await call("june", "POST", "/api/v1/me/pages/june/unpublish")).status).toBe(204);
        expect((await app.request("/june")).status).toBe(404);
    });

    it("refuses a made-up timestamp, and a request from nowhere", async () => {
        const { call, app } = setup();
        const bad = await call("june", "POST", "/api/v1/me/pages/june/publish", {
            updatedAt: "soon",
        });
        expect(bad.status).toBe(400);
        const res = await app.request("/api/v1/me/pages/june/unpublish", {
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
        const draft = (await (await call("june", "GET", "/api/v1/me/pages/june")).json()) as {
            suspended: boolean;
            updatedAt: string;
        };
        expect(draft.suspended).toBe(true);
        const check = (await (await call("june", "GET", "/api/v1/me/pages/june/check")).json()) as {
            issues: { message: string }[];
        };
        expect(check.issues[0]?.message).toContain("taken down");
        const res = await call("june", "POST", "/api/v1/me/pages/june/publish", {
            updatedAt: draft.updatedAt,
        });
        expect(res.status).toBe(422);
        expect((await app.request("/june")).status).toBe(404);
    });

    it("keeps a retry from being a conflict when an older lost save is what landed", async () => {
        const { call } = setup();
        const draft = (await (await call("june", "GET", "/api/v1/me/pages/june")).json()) as {
            updatedAt: string;
        };
        const landed = starterPage("Landed");
        await call("june", "PUT", "/api/v1/me/pages/june", {
            page: landed,
            updatedAt: draft.updatedAt,
        });
        const res = await call("june", "PUT", "/api/v1/me/pages/june", {
            page: starterPage("Later"),
            updatedAt: draft.updatedAt,
            previous: ["somethingthatneverarrived", pageHash(landed)],
        });
        expect(res.status).toBe(200);
    });

    it("refuses oversized address changes and deletions", async () => {
        const { call } = setup();
        const huge = { handle: "x".repeat(10_000) };
        expect((await call("june", "PATCH", "/api/v1/me/pages/june/handle", huge)).status).toBe(
            413,
        );
        expect((await call("june", "DELETE", "/api/v1/me", huge)).status).toBe(413);
    });

    it("limits taking a page down and reading numbers", async () => {
        const { call } = setup();
        let last = 0;
        for (let i = 0; i < 25; i++) {
            last = (await call("june", "POST", "/api/v1/me/pages/june/unpublish", {})).status;
        }
        expect(last).toBe(429);
    });

    it("adds up clicks on links that have since been replaced", async () => {
        const { app, call, pages } = setup();
        await publish(call);
        await app.request("/june", { headers: { "user-agent": "Mozilla/5.0" } });
        pages.counts.push({ pageId: "june", target: "gone" });
        const stats = (await (await call("june", "GET", "/api/v1/me/pages/june/stats")).json()) as {
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
        const post = (body: unknown) =>
            made.call("june", "POST", "/api/v1/me/pages/june/publish", body);
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
        expect((await pages.store.findOwnLive("june", "june"))?.look).toBe("sap");
        expect((await pages.store.findDraft("june", "june"))?.page.look).toBe("bake");
    });

    it("lets everything through while plans are off", async () => {
        const { post } = setupWith(bake());
        expect((await post({ updatedAt: "1" })).status).toBe(204);
    });

    it("clamps statistics to the plan, and says which range it used", async () => {
        const { get } = setupPlans();
        const body = (await (
            await get("/api/v1/me/pages/june/stats?days=90")
        ).json()) as StatsResponse;
        expect(body.range).toBe(7);
        expect(body.days).toHaveLength(7);
    });
});

describe("the live page and plans", () => {
    const DAY = 86_400_000;
    const live = async (plan: { plan: "free" | "pro"; endsAt: Date | null }) => {
        vi.stubEnv("PLANS_ON", "true");
        const { app, pages } = setup();
        pages.addUser("noor", "noor", { ...samplePage, look: "bake" });
        await pages.store.publish("noor", "noor", "1");
        pages.setPlan("noor", plan);
        return (await app.request("/noor")).text();
    };
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("shows the mark on Free and not on Pro", async () => {
        expect(await live({ plan: "free", endsAt: null })).toContain("Made with Tondo");
        expect(await live({ plan: "pro", endsAt: null })).not.toContain("Made with Tondo");
    });

    it("keeps the design for 30 days after a plan ends, then steps down", async () => {
        const ten = await live({ plan: "pro", endsAt: new Date(Date.now() - 10 * DAY) });
        expect(ten).toContain("Made with Tondo");
        expect(ten).toContain('class="look bake"');
        const later = await live({ plan: "pro", endsAt: new Date(Date.now() - 31 * DAY) });
        expect(later).toContain('class="look sap"');
    });

    it("draws neither while plans are off", async () => {
        const { app, pages } = setup();
        pages.addUser("noor", "noor", { ...samplePage, look: "bake" });
        await pages.store.publish("noor", "noor", "1");
        const html = await (await app.request("/noor")).text();
        expect(html).not.toContain("Made with Tondo");
        expect(html).toContain('class="look bake"');
    });
});

describe("several pages", () => {
    const pageRoutes = (id: string): [string, string, unknown?][] => [
        ["GET", `/api/v1/me/pages/${id}`],
        ["PUT", `/api/v1/me/pages/${id}`, { page: withButton, updatedAt: "1" }],
        ["DELETE", `/api/v1/me/pages/${id}`, {}],
        ["PATCH", `/api/v1/me/pages/${id}/handle`, { handle: "stolen" }],
        ["POST", `/api/v1/me/pages/${id}/publish`, { updatedAt: "1" }],
        ["GET", `/api/v1/me/pages/${id}/check`],
        ["GET", `/api/v1/me/pages/${id}/live`],
        ["POST", `/api/v1/me/pages/${id}/unpublish`, {}],
        ["GET", `/api/v1/me/pages/${id}/stats`],
    ];

    it.each(pageRoutes("rae"))(
        "answers %s %s with 404 for someone else's page",
        async (...args) => {
            const [method, path, body] = args;
            const { call } = setup();
            expect((await call("june", method, path, body)).status).toBe(404);
        },
    );

    const add = (call: ReturnType<typeof setup>["call"], handle: string, extra: object = {}) =>
        call("june", "POST", "/api/v1/me/pages", { name: "Band", handle, ...extra });

    it("adds a page with its own address, draft and list entry", async () => {
        const { call } = setup();
        const res = await add(call, "the-low-notes", { look: "sap" });
        expect(res.status).toBe(201);
        const { id } = (await res.json()) as { id: string };
        const draft = (await (await call("june", "GET", `/api/v1/me/pages/${id}`)).json()) as {
            handle: string;
            page: Page;
        };
        expect(draft.handle).toBe("the-low-notes");
        expect(draft.page.look).toBe("sap");
        expect(draft.page.header.name).toBe("Band");
        const list = (await (await call("june", "GET", "/api/v1/me/pages")).json()) as {
            pages: { handle: string }[];
        };
        expect(list.pages.map((page) => page.handle)).toEqual(["june", "the-low-notes"]);
    });

    it("refuses an address that's taken or reserved", async () => {
        const { call } = setup();
        expect((await add(call, "rae")).status).toBe(409);
        expect((await add(call, "pricing")).status).toBe(400);
    });

    it("copies only the person's own page", async () => {
        const { call } = setup();
        expect((await add(call, "copy-of-rae", { from: "rae" })).status).toBe(404);
        expect((await add(call, "copy-of-june", { from: "june" })).status).toBe(201);
    });

    it("stops at the plan's page limit, as a plan refusal", async () => {
        const { call } = setup();
        for (const name of ["two", "three", "four", "five"]) {
            expect((await add(call, name)).status).toBe(201);
        }
        const res = await add(call, "six");
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ code: "plan_limit" });
    });

    it("can't delete the last page, and deleting another frees its address", async () => {
        const { call, app } = setup();
        expect((await call("june", "DELETE", "/api/v1/me/pages/june", {})).status).toBe(409);
        const { id } = (await (await add(call, "second")).json()) as { id: string };
        expect((await call("june", "DELETE", `/api/v1/me/pages/${id}`, {})).status).toBe(204);
        expect((await app.request("/second")).status).toBe(404);
        expect((await add(call, "second")).status).toBe(201);
    });

    it("changes one address and leaves the others working", async () => {
        const { call, app } = setup();
        await call("june", "PUT", "/api/v1/me/pages/june", { page: withButton, updatedAt: "1" });
        await call("june", "POST", "/api/v1/me/pages/june/publish", { updatedAt: "2" });
        expect((await app.request("/june")).status).toBe(200);
        const res = await call("june", "PATCH", "/api/v1/me/pages/june/handle", {
            handle: "moved",
        });
        expect(await res.json()).toEqual({ handle: "moved" });
        expect((await app.request("/june")).status).toBe(404);
        expect((await app.request("/moved")).status).toBe(200);
        const taken = await call("june", "PATCH", "/api/v1/me/pages/june/handle", {
            handle: "rae",
        });
        expect(taken.status).toBe(409);
    });

    it("won't change a suspended page's address", async () => {
        const { call, pages } = setup();
        pages.suspend("june");
        const res = await call("june", "PATCH", "/api/v1/me/pages/june/handle", {
            handle: "fresh",
        });
        expect(res.status).toBe(403);
    });

    it("keeps numbers apart per page", async () => {
        const { call, pages } = setup();
        const { id } = (await (await add(call, "second")).json()) as { id: string };
        await pages.store.count(id, "");
        const read = async (page: string) =>
            (
                (await (
                    await call("june", "GET", `/api/v1/me/pages/${page}/stats`)
                ).json()) as StatsResponse
            ).views;
        expect(await read(id)).toBe(1);
        expect(await read("june")).toBe(0);
    });
});
