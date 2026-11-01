import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page as Tab } from "@playwright/test";
import { pageSchema, sectionsOf } from "@tondo/page";
import { canvas, panel, signUpToEditor } from "./helpers";
import { TEST_DATABASE } from "./setup-database";

const read = (example: string) =>
    pageSchema.parse(
        JSON.parse(readFileSync(`apps/marketing/src/data/pages/${example}.json`, "utf8")),
    );

// Different looks, with and without tabs and a signature header.
const EXAMPLES = [
    { example: "lowtidesurf", look: "surf", signature: ".p-sun" },
    { example: "osterialume", look: "lume", tabs: true },
    { example: "riversiderovers", look: "rovers", signature: ".p-crest" },
    { example: "fieldoffice", look: "office" },
    { example: "smallwebday", look: "conf", tabs: true },
];

/** Every link the page still needs, filled in the way the publish panel asks for them. */
async function publishWithLinks(page: Tab) {
    const issue = page.locator(".pub-issues li button").first();
    const published = page.locator(".publish", { hasText: /^Published$/ });
    const anyway = page.getByRole("button", { name: "Publish without these" });
    await page.locator(".publish").click();
    await expect(issue.or(published).or(anyway).first()).toBeVisible();
    while (await issue.isVisible()) {
        await issue.click();
        await panel(page).getByRole("textbox", { name: "Link" }).first().fill("shop.example.com");
        await panel(page).getByRole("button", { name: "Close" }).click();
        await expect(page.locator(".status")).toHaveText("Saved");
        await page.locator(".publish").click();
        await expect(issue.or(published).or(anyway).first()).toBeVisible();
    }
    if (await anyway.isVisible()) await anyway.click();
    await expect(published).toBeVisible();
}

for (const { example, look, signature, tabs } of EXAMPLES) {
    test(`${example} opens in the builder, edits and publishes`, async ({
        page,
        browser,
    }, info) => {
        test.skip(info.project.name === "phone", "One screen size covers this.");
        const handle = await signUpToEditor(page);
        await expect(page.locator(".status")).toHaveText("Saved");
        execFileSync("pnpm", ["exec", "tsx", "scripts/load-example.ts", example, handle], {
            env: { ...process.env, DATABASE_URL: TEST_DATABASE },
        });
        await page.reload();

        const doc = read(example);
        const sections = sectionsOf(doc.blocks);
        const rows = page.locator("#rows .row");
        await expect(rows).toHaveCount(sections.length);
        for (const [i, section] of sections.entries()) {
            await expect(rows.nth(i)).toContainText(section.definition.name);
        }
        const frame = canvas(page);
        await expect(frame.locator("html")).toHaveClass(new RegExp(look));
        if (signature) await expect(frame.locator(signature)).toBeVisible();
        if (tabs) await expect(frame.locator(".b-tabbar")).toBeVisible();

        const titled = sections.findIndex((section) => section.title);
        await rows.nth(titled).click();
        await panel(page).getByLabel("Title above it (optional)").fill("Edited in the builder");
        await panel(page).getByRole("button", { name: "Close" }).click();
        await expect(page.locator(".status")).toHaveText("Saved");

        await publishWithLinks(page);

        const visitor = await browser.newContext({ userAgent: "Mozilla/5.0" });
        const live = await visitor.newPage();
        const answer = await live.goto(new URL(`/${handle}`, page.url()).href);
        expect(answer?.status()).toBe(200);
        await expect(live.locator("html")).toHaveClass(new RegExp(look));
        await expect(live.locator("#t-header h1")).toHaveText(doc.header.name);
        await expect(live.locator("#t-blocks")).toContainText("Edited in the builder");
        // Every other title reached the live page too.
        for (const section of sections.filter((_, i) => i !== titled)) {
            if (section.title && !tabs) {
                await expect(live.locator("#t-blocks")).toContainText(section.title.text);
            }
        }
        if (signature) await expect(live.locator(signature)).toBeVisible();
        await visitor.close();
    });
}
