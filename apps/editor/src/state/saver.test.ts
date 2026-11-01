import { samplePage } from "@tondo/page";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSaver } from "./saver";

const pageWith = (name: string) => ({
    ...samplePage,
    header: { ...samplePage.header, name },
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("saver", () => {
    it("remembers every save whose answer was lost, so retrying isn't a false conflict", async () => {
        const sent: { previous?: string[] }[] = [];
        const replies = [
            () => Promise.reject(new TypeError("answer lost")),
            () => Promise.reject(new TypeError("never arrived")),
            () => Promise.resolve(Response.json({ updatedAt: "2" })),
        ];
        vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
            sent.push(JSON.parse(init.body as string) as { previous?: string[] });
            const reply = replies[sent.length - 1];
            if (!reply) throw new Error("Too many saves.");
            return reply();
        });
        const saver = createSaver({
            handle: "june",
            updatedAt: "1",
            onLoggedOut: () => undefined,
        });
        saver.change(pageWith("First"));
        await saver.flush();
        saver.change(pageWith("Second"));
        await saver.flush();
        saver.change(pageWith("Third"));
        await saver.flush();
        expect(sent[2]?.previous).toHaveLength(2);
        expect(sent[2]?.previous?.[0]).not.toBe(sent[2]?.previous?.[1]);
        expect(saver.state()).toBe("saved");
    });
});
