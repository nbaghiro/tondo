import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { openSections, panel, signUpToEditor, draftUrl } from "./helpers";
import { TEST_DATABASE } from "./setup-database";

const onDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 900;

async function putButton(page: Page, url: string) {
    await page.evaluate(
        async ({ link, draftUrl }) => {
            const res = await fetch(draftUrl);
            const draft = (await res.json()) as { page: { blocks: unknown[] }; updatedAt: string };
            await fetch(draftUrl, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    updatedAt: draft.updatedAt,
                    page: {
                        ...draft.page,
                        blocks: [
                            ...draft.page.blocks,
                            {
                                id: "b1",
                                section: "b1",
                                type: "button",
                                variant: "filled",
                                text: "Mine",
                                url: link,
                            },
                        ],
                    },
                }),
            });
        },
        { link: url, draftUrl: await draftUrl(page) },
    );
}

test("changing the address reaches Home and Share at once", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await page.goto("/app/settings");
    const next = `${handle}x`.slice(-30);
    await page.locator("input[name=address]").fill(next);
    await page.locator("button", { hasText: "Change address" }).click();
    await expect(page.locator(".toast-s")).toContainText(next);

    await page
        .locator("a[href*='/app/account']")
        .first()
        .evaluate((el: HTMLElement) => {
            el.click();
        });
    await expect(page.locator("input[name=confirm]")).toBeVisible();
    await page.evaluate(() => {
        history.back();
    });
    await page.locator("input[name=address]").waitFor();
    await expect(page.locator("input[name=address]")).toHaveValue(next);
    await page
        .locator("a[href*='/app/?page=']")
        .first()
        .evaluate((el: HTMLElement) => {
            el.click();
        });
    await expect(page.locator(".addr")).toHaveText(`tondo.page/${next}`);
    await expect(page.locator(".addr")).toHaveAttribute("href", new RegExp(`/${next}$`));
});

test("a taken-down page says so in Page settings, the builder and the checklist", async ({
    page,
}) => {
    const handle = await signUpToEditor(page);
    await putButton(page, "https://fine.example.com/");
    const draft = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            return (await res.json()) as { updatedAt: string };
        },
        await draftUrl(page),
    );
    const address = await draftUrl(page);
    await page.evaluate(
        async ({ updatedAt, draftUrl }) => {
            await fetch(`${draftUrl}/publish`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ updatedAt }),
            });
        },
        { updatedAt: draft.updatedAt, draftUrl: address },
    );
    const sql = postgres(TEST_DATABASE, { max: 1 });
    await sql`update users set suspended_at = now() where id = (select user_id from pages where handle = ${handle})`;
    await sql.end();

    await page.goto("/app/settings");
    await expect(page.getByText("taken down for breaking our rules")).toBeVisible();
    await expect(page.locator(".unpublish")).toHaveCount(0);

    await page.goto("/app");
    await expect(page.locator("li:has([data-check=publish])")).not.toHaveClass(/done/);

    await page.goto("/app/edit");
    await expect(page.locator(".publish")).toHaveText("Taken down");
    await page.locator(".publish").click();
    await expect(page.locator(".pub-issues")).toContainText("taken down");
});

test("Home includes what was typed right before leaving the builder", async ({ page }) => {
    await signUpToEditor(page);
    await openSections(page);
    await page.getByRole("button", { name: /Your name, photo and links/ }).click();
    const bio = panel(page).getByRole("textbox", { name: "Short line" });
    await bio.fill("Typed just before leaving");
    await page.goto("/app");
    await expect(page.locator("[data-check=bio], .check").first()).toBeVisible();
    const draft = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            return ((await res.json()) as { page: { header: { tagline?: string } } }).page.header;
        },
        await draftUrl(page),
    );
    expect(draft.tagline).toBe("Typed just before leaving");
});

test("a refused link is named in the panel and clears once it's changed", async ({ page }) => {
    await signUpToEditor(page);
    await putButton(page, "http://blocked.example.:80/");
    await page.goto("/app/edit");
    await page.locator(".publish").click();
    await expect(page.locator(".pub-issues")).toContainText("blocked.example");
    await expect(page.locator(".pub .go")).toHaveCount(0);
    await putButton(page, "https://fine.example.com/");
});

test("typed settings survive a conflict, and taking a page down asks first", async ({ page }) => {
    await signUpToEditor(page);
    await putButton(page, "https://fine.example.com/");
    await page.goto("/app/settings");
    await page.locator("input[name=title]").fill("My typed title");
    await putButton(page, "https://other.example.com/");
    await page.locator(".save-details").click();
    await expect(page.locator(".toast-s")).toContainText("kept what you typed");
    await expect(page.locator("input[name=title]")).toHaveValue("My typed title");
    await page.locator(".save-details").click();
    await expect(page.locator(".toast-s")).toContainText("Saved");
});

test("an unknown address, a missing file and a named report page behave", async ({
    page,
    request,
}) => {
    const violations: string[] = [];
    page.on("console", (message) => {
        if (message.text().includes("Content Security Policy")) violations.push(message.text());
    });
    await signUpToEditor(page);
    await page.goto("/app/nonsense");
    await expect(page.locator("h2", { hasText: "There's nothing here" })).toBeVisible();
    await expect(page).toHaveTitle("Not found | Tondo");
    await page.goto("/app/analytics");
    await expect(page).toHaveTitle("Analytics | Tondo");
    expect(violations.filter((text) => text.includes("eval"))).toEqual([]);

    expect((await request.get("/app/assets/nope.js")).status()).toBe(404);
    expect((await request.get("/app/nope.css")).status()).toBe(404);
    expect((await request.get("/app")).headers()["x-content-type-options"]).toBe("nosniff");

    await page.goto("/report?page=june");
    await expect(page.locator("[data-report-page]")).toContainText("tondo.page/june");
    await expect(page.locator("[data-report]")).toHaveAttribute("href", /subject=.*june/);
});

test("chart labels stay readable at phone size", async ({ page, request }) => {
    test.skip(onDesktop(page), "Phone only");
    const handle = await signUpToEditor(page);
    await putButton(page, "https://fine.example.com/");
    await page.evaluate(
        async (draftUrl) => {
            const draft = (await (await fetch(draftUrl)).json()) as { updatedAt: string };
            await fetch(`${draftUrl}/publish`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ updatedAt: draft.updatedAt }),
            });
        },
        await draftUrl(page),
    );
    await request.get(`/${handle}`, { headers: { "user-agent": "Mozilla/5.0" } });
    await expect
        .poll(async () => {
            await page.goto("/app/analytics");
            return page.locator(".chart svg").count();
        })
        .toBe(1);
    const size = await page.locator(".chart svg").evaluate((svg) => {
        const box = svg.getBoundingClientRect();
        return { shown: box.width, drawn: Number(svg.getAttribute("viewBox")?.split(" ")[2]) };
    });
    expect(Math.abs(size.shown - size.drawn)).toBeLessThan(2);
});
