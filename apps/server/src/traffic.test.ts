import { readdirSync } from "node:fs";
import { isReservedHandle } from "@tondo/page";
import { describe, expect, it, vi } from "vitest";
import { blockedLinks } from "./limits";
import { samplePage } from "@tondo/page";
import { createCache, createCounter, createLimiter } from "./traffic";

describe("limits", () => {
    it("refuses over the limit, then lets people back after the window", () => {
        const allow = createLimiter(2, 1000);
        expect([allow("a", 0), allow("a", 1), allow("a", 2)]).toEqual([true, true, false]);
        expect(allow("b", 2)).toBe(true);
        expect(allow("a", 2000)).toBe(true);
    });

    it("adds counts up and writes them together", async () => {
        const write = vi.fn(() => Promise.resolve());
        const counter = createCounter(write, 60_000);
        counter.count("p", "");
        counter.count("p", "");
        counter.count("p", "x");
        await counter.stop();
        expect(write).toHaveBeenCalledWith("p", "", 2);
        expect(write).toHaveBeenCalledWith("p", "x", 1);
    });

    it("remembers an answer until it's dropped", async () => {
        const cache = createCache<number>(60_000);
        const load = vi.fn(() => Promise.resolve(1));
        await cache.get("k", load);
        await cache.get("k", load);
        expect(load).toHaveBeenCalledTimes(1);
        cache.drop("k");
        await cache.get("k", load);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it("refuses links on the blocklist", () => {
        const page = {
            ...samplePage,
            description: "https://evil.example/login",
        };
        expect(blockedLinks(page, ["evil.example"])).toEqual(["https://evil.example/login"]);
        expect(blockedLinks(samplePage, ["evil.example"])).toEqual([]);
    });
});

describe("reserved addresses", () => {
    it("covers every page on the marketing site, and everything in its public folder", () => {
        const names = [
            ...readdirSync(new URL("../../marketing/src/pages", import.meta.url))
                .filter((name) => !name.startsWith("[") && name !== "index.astro")
                .map((name) => name.replace(/\.astro$/, "")),
            ...readdirSync(new URL("../../marketing/public", import.meta.url))
                .filter((name) => !name.includes("."))
                .map((name) => name),
        ];
        expect(names.filter((name) => !isReservedHandle(name))).toEqual([]);
    });

    it("includes words that could pose as Tondo", () => {
        for (const word of ["tondo", "security", "billing", "abuse", "status", "account"]) {
            expect(isReservedHandle(word)).toBe(true);
        }
    });
});
