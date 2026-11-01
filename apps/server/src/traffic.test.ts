import { readdirSync } from "node:fs";
import { isReservedHandle } from "@tondo/page";
import { describe, expect, it, vi } from "vitest";
import { blockedIssues, blockedLinks, isBlockedLink } from "./blocked";
import { samplePage } from "@tondo/page";
import { createCache, createCounter, createLimiter, pickIp } from "./traffic";

describe("limits", () => {
    it("only believes as many forwarded addresses as we have proxies", () => {
        expect(pickIp("1.2.3.4", 0, "socket")).toBe("socket");
        expect(pickIp("forged, 9.9.9.9", 1, "socket")).toBe("9.9.9.9");
        expect(pickIp("forged, 9.9.9.9, 10.0.0.1", 2, "socket")).toBe("9.9.9.9");
        expect(pickIp(undefined, 1, "socket")).toBe("socket");
        expect(pickIp("9.9.9.9", 2, "socket")).toBe("socket");
    });

    it("doesn't forget someone being limited when a flood of new keys arrives", () => {
        const allow = createLimiter(1, 60_000, 100);
        allow("limited", 0);
        expect(allow("limited", 1)).toBe(false);
        for (let i = 0; i < 1000; i++) {
            allow(`flood${String(i)}`, 2);
            if (i % 50 === 0) expect(allow("limited", 2)).toBe(false);
        }
        expect(allow("limited", 3)).toBe(false);
    });

    it("recognises a blocked host however it's written", () => {
        const blocked = ["evil.example", "xn--bcher-kva.example"];
        for (const url of [
            "https://evil.example/",
            "http://EVIL.example/x",
            "http://evil.example.:80/",
            "https://sub.evil.example./x",
            "https://bücher.example/",
        ]) {
            expect(isBlockedLink(url, blocked), url).toBe(true);
        }
        expect(isBlockedLink("https://notevil.example/", blocked)).toBe(false);
    });

    it("says which section a blocked link is in", () => {
        const page = {
            ...samplePage,
            blocks: [
                {
                    id: "b1",
                    type: "button" as const,
                    variant: "filled" as const,
                    text: "Go",
                    url: "https://evil.example/",
                },
            ],
        };
        const [issue] = blockedIssues(page, ["evil.example"]);
        expect(issue?.target).toBe("b1");
        expect(issue?.message).toContain("evil.example");
        expect(issue?.url).toBe("https://evil.example/");
    });

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
