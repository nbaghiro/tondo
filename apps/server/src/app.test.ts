import { sampleHandle, samplePage } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createFakePages, createFakeStore } from "./fake-store";

const app = createApp({
    auth: { store: createFakeStore(), siteUrl: "http://site", editorUrl: "http://editor" },
    pages: createFakePages({ [sampleHandle]: samplePage }).store,
});

describe("server", () => {
    it("reports health", async () => {
        const res = await app.request("/health");
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok" });
    });

    it("serves a public page with no scripts allowed", async () => {
        const res = await app.request("/sample");
        expect(res.status).toBe(200);
        expect(await res.text()).toContain("Maya Okafor");
        expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    });

    it("finds a page whatever the case of the address", async () => {
        const res = await app.request("/SAMPLE");
        expect(res.status).toBe(301);
        expect(res.headers.get("location")).toBe("/sample");
    });

    it("doesn't hand out saved documents, which hold hidden blocks", async () => {
        expect((await app.request("/api/v1/pages/sample")).status).toBe(404);
    });

    it.each(["/nobody", "/api", "/not_valid", "/api/v1/pages/sample"])(
        "404s on %s",
        async (path) => {
            expect((await app.request(path)).status).toBe(404);
        },
    );
});
