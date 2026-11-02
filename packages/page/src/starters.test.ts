import { describe, expect, it } from "vitest";
import { liveContent } from "./sample-content";
import { setupChecklist } from "./checklist";
import { addSection } from "./sections";
import { starterPage } from "./samples";
import { starterSection, starterTagline, starterUses } from "./starters";
import type { Page } from "./schema";

function started(id: string): Page {
    let i = 0;
    const makeId = () => `id${String((i += 1))}`;
    const use = starterUses.find((other) => other.id === id);
    let page = starterPage("Maya");
    page = { ...page, header: { ...page.header, tagline: starterTagline(id) } };
    (use?.sections ?? []).forEach((section, at) => {
        page = addSection(page, starterSection(id, section.key, makeId), at);
    });
    return page;
}

describe.each(starterUses.map((use) => use.id))("the %s starter", (id) => {
    it("has its own words in the builder", () => {
        const page = started(id);
        expect(page.blocks.length).toBeGreaterThan(0);
        expect(page.header.tagline).toBeTruthy();
    });

    it("keeps every sample word off the live page", () => {
        const { page } = liveContent(started(id));
        expect(page.header.tagline).toBeUndefined();
        const words = JSON.stringify(page.blocks.filter((block) => block.type !== "gallery"));
        for (const section of starterUses.find((use) => use.id === id)?.sections ?? []) {
            for (const block of section.blocks ?? []) {
                for (const value of Object.values(block)) {
                    if (typeof value === "string") expect(words).not.toContain(value);
                }
            }
        }
    });

    it("still asks the person to say who they are", () => {
        const items = setupChecklist(started(id), { published: false });
        expect(items.find((item) => item.id === "about")?.done).toBe(false);
    });
});

it("keeps a tagline the person wrote", () => {
    const page = started("me");
    const mine = { ...page, header: { ...page.header, tagline: "Potter in Vancouver" } };
    expect(liveContent(mine).page.header.tagline).toBe("Potter in Vancouver");
});
