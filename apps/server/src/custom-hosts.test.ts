import { starterPage } from "@tondo/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { hostOf } from "./custom-hosts";
import { domainCode, isRefusedDomain, readDomain } from "./domains";
import { createFakeDomains, createFakePages, createFakeStore } from "./fake-store";
import type { Hosting } from "./hosting";

const maya = { ...starterPage("Maya"), description: "Maya's page" };
const other = starterPage("Someone else");
const APP = "tondo.page";
const appHosts = new Set([APP, "tondo.onrender.com"]);

const hosting: Hosting = {
    addressRecords: () => [],
    add: () => Promise.resolve("added"),
    isReady: () => Promise.resolve(true),
    remove: () => Promise.resolve(),
    readTxt: () => Promise.resolve([]),
};

async function setup() {
    const pages = createFakePages({ maya, other });
    const store = createFakeDomains(
        new Map([
            ["seed-maya", "maya"],
            ["seed-other", "other"],
        ]),
    );
    pages.setPlan("seed-maya", { plan: "pro", endsAt: null });
    await store.add("seed-maya", "maya.example.com");
    await store.verify("seed-maya");
    const app = createApp({
        pages: pages.store,
        auth: { store: createFakeStore(), siteUrl: "", editorUrl: "/app" },
        publicOrigin: `https://${APP}`,
        domains: { store, hosting, appHosts },
    });
    const visit = (path: string, host: string, init: RequestInit = {}) =>
        app.request(`http://${host}${path}`, {
            ...init,
            headers: { host, ...(init.headers as Record<string, string> | undefined) },
        });
    return { app, pages, store, visit };
}

describe("custom hosts", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("serves only the holder's page at a domain, with its own canonical address", async () => {
        const { visit } = await setup();
        const res = await visit("/", "maya.example.com");
        const html = await res.text();
        expect(res.status).toBe(200);
        expect(html).toContain('<link rel="canonical" href="https://maya.example.com/">');
        expect(html).toContain('property="og:url" content="https://maya.example.com/"');
        expect(html).toContain('href="https://tondo.page/report?page=maya"');
        expect(html).not.toContain("Someone else");
    });

    it.each([
        "/other",
        "/maya",
        "/app",
        "/app/settings",
        "/login",
        "/signup",
        "/pricing",
        "/api/v1/me",
        "/api/v1/me/pages",
        "/api/auth/get-session",
        "/api/stripe/webhook",
        "/l/other/abc",
    ])("doesn't reach %s from a customer's domain", async (path) => {
        const { visit } = await setup();
        const res = await visit(path, "maya.example.com");
        const text = await res.text();
        expect(res.status).toBe(404);
        expect(text).toContain("no page here");
        expect(text).not.toContain("Someone else");
    });

    it("refuses anything but reading, so the API can't be posted to through a domain", async () => {
        const { visit } = await setup();
        for (const path of ["/", "/api/v1/me/pages", "/api/stripe/webhook"]) {
            expect((await visit(path, "maya.example.com", { method: "POST" })).status).toBe(404);
        }
    });

    it.each(["evil.example.com", "other.example.com", "tondo.page.evil.com", "1.2.3.4"])(
        "shows nothing at %s, which nobody holds",
        async (host) => {
            const { visit } = await setup();
            for (const path of ["/", "/maya", "/other", "/app", "/api/v1/me"]) {
                const res = await visit(path, host);
                expect(res.status).toBe(404);
                expect(await res.text()).not.toContain("Maya");
            }
        },
    );

    it("doesn't believe forwarded headers", async () => {
        const { visit } = await setup();
        const headers = {
            "x-forwarded-host": APP,
            "x-original-host": APP,
            forwarded: `host=${APP}`,
        };
        expect((await visit("/api/v1/me", "maya.example.com", { headers })).status).toBe(404);
        const sneaked = await visit("/", "evil.example.com", {
            headers: { "x-forwarded-host": "maya.example.com" },
        });
        expect(sneaked.status).toBe(404);
        const main = await visit("/other", APP, { headers: { "x-forwarded-host": "evil.com" } });
        expect(main.status).toBe(200);
    });

    it("keeps the whole site at Tondo's own addresses, in any case and with a port", async () => {
        const { visit } = await setup();
        expect((await visit("/other", APP)).status).toBe(200);
        expect((await visit("/other", "TONDO.page:443")).status).toBe(200);
        expect((await visit("/other", "tondo.page.")).status).toBe(200);
        expect((await visit("/other", "tondo.onrender.com")).status).toBe(200);
    });

    it("answers health checks whatever the address", async () => {
        const { visit } = await setup();
        expect((await visit("/health", "10.0.0.1")).status).toBe(200);
    });

    it("sends www to the bare domain, only for a domain someone holds", async () => {
        const { visit } = await setup();
        const res = await visit("/?a=1", "www.maya.example.com");
        expect(res.status).toBe(301);
        expect(res.headers.get("location")).toBe("https://maya.example.com/?a=1");
        expect((await visit("/", "www.evil.example.com")).status).toBe(404);
    });

    it("keeps serving the tondo.page address, pointing search at the domain", async () => {
        const { visit } = await setup();
        const html = await (await visit("/maya", APP)).text();
        expect(html).toContain('<link rel="canonical" href="https://maya.example.com/">');
        expect(html).toContain('href="/report?page=maya"');
        const plain = await (await visit("/other", APP)).text();
        expect(plain).toContain('<link rel="canonical" href="https://tondo.page/other">');
    });

    it("lists a page once: at its domain, and not in tondo.page's sitemap", async () => {
        const { visit } = await setup();
        const main = await (await visit("/sitemap.xml", APP)).text();
        expect(main).toContain("https://tondo.page/other");
        expect(main).not.toContain("maya");
        const own = await (await visit("/sitemap.xml", "maya.example.com")).text();
        expect(own).toContain("<loc>https://maya.example.com/</loc>");
        expect(own).not.toContain("other");
        const robots = await (await visit("/robots.txt", "maya.example.com")).text();
        expect(robots).toContain("Sitemap: https://maya.example.com/sitemap.xml");
    });

    it("counts visits and clicks on the same page", async () => {
        const pages = createFakePages({ maya });
        pages.setPlan("seed-maya", { plan: "pro", endsAt: null });
        const store = createFakeDomains(new Map([["seed-maya", "maya"]]));
        await store.add("seed-maya", "maya.example.com");
        await store.verify("seed-maya");
        const app = createApp({
            pages: pages.store,
            auth: { store: createFakeStore(), siteUrl: "", editorUrl: "/app" },
            publicOrigin: `https://${APP}`,
            domains: { store, hosting, appHosts },
        });
        await app.request("http://maya.example.com/", { headers: { host: "maya.example.com" } });
        expect(pages.counts).toEqual([{ pageId: "seed-maya", target: "" }]);
    });

    it("shows nothing at a domain whose plan has ended or doesn't include one", async () => {
        vi.stubEnv("PLANS_ON", "true");
        for (const plan of [
            { plan: "starter" as const, endsAt: null },
            { plan: "pro" as const, endsAt: new Date(Date.now() - 1000) },
        ]) {
            const { pages, visit } = await setup();
            pages.setPlan("seed-maya", plan);
            const res = await visit("/", "maya.example.com");
            expect(res.status).toBe(404);
            expect(await res.text()).not.toContain("Maya");
        }
    });

    it("keeps Starter's page at tondo.page, without pointing search at the domain", async () => {
        vi.stubEnv("PLANS_ON", "true");
        const { pages, visit } = await setup();
        pages.setPlan("seed-maya", { plan: "starter", endsAt: null });
        const html = await (await visit("/maya", APP)).text();
        expect(html).toContain('<link rel="canonical" href="https://tondo.page/maya">');
    });

    it("shows nothing at a domain once its person is taken down", async () => {
        const { pages, visit } = await setup();
        pages.suspend("seed-maya");
        expect((await visit("/", "maya.example.com")).status).toBe(404);
    });

    it("doesn't serve a domain nobody has proved yet", async () => {
        const { store, visit } = await setup();
        await store.add("seed-other", "asked.example.com");
        expect((await visit("/", "asked.example.com")).status).toBe(404);
    });
});

describe("with customer domains off", () => {
    it("serves every address as it always has", async () => {
        const pages = createFakePages({ other });
        const app = createApp({
            pages: pages.store,
            auth: { store: createFakeStore(), siteUrl: "", editorUrl: "/app" },
        });
        const res = await app.request("http://any.example.com/other", {
            headers: { host: "any.example.com" },
        });
        expect(res.status).toBe(200);
    });
});

describe("reading a domain", () => {
    it.each([
        ["maya.com", "maya.com"],
        ["  https://www.Maya.com/links?x=1 ", "maya.com"],
        ["http://shop.maya.co.uk/", "shop.maya.co.uk"],
        ["www.maya.co.uk.", "maya.co.uk"],
        ["café.com", "xn--caf-dma.com"],
    ])("reads %s as %s", (raw, host) => {
        expect(readDomain(raw)).toBe(host);
    });

    it.each(["", "maya", "co.uk", "com", "1.2.3.4", "maya.notatld", "a@maya.com", "maya.com:8080"])(
        "refuses %s",
        (raw) => {
            expect(readDomain(raw)).toBeNull();
        },
    );

    it.each(["tondo.page", "www.tondo.page", "a.tondo.page", "tondo.onrender.com", "x.render.com"])(
        "never connects %s",
        (host) => {
            expect(isRefusedDomain(host, appHosts)).toBe(true);
        },
    );

    it("ties the code to the page and the domain", () => {
        expect(domainCode("a", "maya.com")).not.toBe(domainCode("b", "maya.com"));
        expect(domainCode("a", "maya.com")).not.toBe(domainCode("a", "other.com"));
    });

    it.each([
        ["tondo.page", "tondo.page"],
        ["TONDO.PAGE:8080", "tondo.page"],
        ["tondo.page.", "tondo.page"],
        ["a@tondo.page", null],
        ["tondo.page/x", null],
        ["evil.com, tondo.page", null],
        ["", null],
        [undefined, null],
    ])("reads the Host header %s as %s", (header, host) => {
        expect(hostOf(header)).toBe(host);
    });
});
