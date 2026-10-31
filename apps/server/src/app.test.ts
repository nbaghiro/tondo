import { sampleHandle, samplePage } from "@tondo/page";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createFakeStore } from "./fake-store";

const app = createApp({
    auth: { store: createFakeStore(), siteUrl: "http://site", editorUrl: "http://editor" },
    findPage: (handle) => Promise.resolve(handle === sampleHandle ? samplePage : null),
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
        expect((await app.request("/SAMPLE")).status).toBe(200);
    });

    it("returns a page as JSON", async () => {
        const res = await app.request("/api/v1/pages/sample");
        expect(await res.json()).toEqual({ page: samplePage });
    });

    it.each(["/nobody", "/api", "/not_valid", "/api/v1/pages/nobody"])(
        "404s on %s",
        async (path) => {
            expect((await app.request(path)).status).toBe(404);
        },
    );
});
