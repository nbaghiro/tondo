import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { signUpToEditor, setPlan } from "./helpers";
import { TEST_DATABASE } from "./setup-database";

const PAGES = "/api/v1/me/pages";

const addPage = (page: Page, handle: string) =>
    page.request.post(PAGES, { data: { name: "The Low Notes", handle } });

const unique = (word: string) => `${word}-${Date.now().toString(36)}${String(process.pid)}`;

async function publishWithLink(page: Page, id: string) {
    const url = `${PAGES}/${id}`;
    const draft = (await (await page.request.get(url)).json()) as {
        page: object;
        updatedAt: string;
    };
    const saved = await page.request.put(url, {
        data: {
            updatedAt: draft.updatedAt,
            page: {
                ...draft.page,
                blocks: [
                    {
                        id: "b1",
                        type: "button",
                        variant: "filled",
                        text: "Tickets",
                        url: "https://tickets.example.com/",
                    },
                ],
            },
        },
    });
    const { updatedAt } = (await saved.json()) as { updatedAt: string };
    expect((await page.request.post(`${url}/publish`, { data: { updatedAt } })).status()).toBe(204);
}

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 900;

test("a second page has its own address, publishing and numbers", async ({ page, request }) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    const first = await signUpToEditor(page);
    const second = unique("band");
    const made = await addPage(page, second);
    expect(made.status()).toBe(201);
    const { id } = (await made.json()) as { id: string };

    expect((await request.get(`/${second}`)).status()).toBe(404);
    await publishWithLink(page, id);
    const visit = await request.get(`/${second}`, { headers: { "user-agent": "Mozilla/5.0" } });
    expect(await visit.text()).toContain("Tickets");
    expect((await request.get(`/${first}`)).status()).toBe(404);

    await expect
        .poll(async () => {
            const res = await page.request.get(`${PAGES}/${id}/stats`);
            return ((await res.json()) as { views: number }).views;
        })
        .toBe(1);
    const list = (await (await page.request.get(PAGES)).json()) as {
        pages: { id: string; handle: string; live: boolean }[];
    };
    expect(list.pages.map((other) => other.handle)).toEqual([first, second]);
    expect(list.pages.map((other) => other.live)).toEqual([false, true]);
    const firstId = list.pages[0]?.id ?? "";
    const stats = await page.request.get(`${PAGES}/${firstId}/stats`);
    expect(((await stats.json()) as { views: number }).views).toBe(0);
});

test("an address has one owner, and another person can't reach a page", async ({
    page,
    browser,
}) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    const first = await signUpToEditor(page);
    expect((await addPage(page, first)).status()).toBe(409);
    const me = (await (await page.request.get("/api/v1/me")).json()) as {
        pages: { id: string }[];
    };
    const id = me.pages[0]?.id ?? "";

    const context = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const other = await context.newPage();
    await signUpToEditor(other);
    expect((await other.request.get(`${PAGES}/${id}`)).status()).toBe(404);
    expect((await other.request.get(`${PAGES}/not-a-page-id`)).status()).toBe(404);
    expect((await other.request.delete(`${PAGES}/${id}`, { data: {} })).status()).toBe(404);
    await context.close();
});

test("changing and deleting work on one page, and the last page stays", async ({
    page,
    request,
}) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    await signUpToEditor(page);
    const second = unique("two");
    const { id } = (await (await addPage(page, second)).json()) as { id: string };
    await publishWithLink(page, id);
    const moved = unique("moved");
    const changed = await page.request.patch(`${PAGES}/${id}/handle`, { data: { handle: moved } });
    expect(changed.status()).toBe(200);
    expect((await request.get(`/${second}`)).status()).toBe(404);
    expect((await request.get(`/${moved}`)).status()).toBe(200);

    expect((await page.request.delete(`${PAGES}/${id}`, { data: {} })).status()).toBe(204);
    expect((await request.get(`/${moved}`)).status()).toBe(404);
    const left = (await (await page.request.get(PAGES)).json()) as { pages: { id: string }[] };
    expect(left.pages).toHaveLength(1);
    const last = await page.request.delete(`${PAGES}/${left.pages[0]?.id ?? ""}`, { data: {} });
    expect(last.status()).toBe(409);
});

test("Free stops at its page limit", async ({ page }) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    const handle = await signUpToEditor(page);
    await setPlan(handle, "free");
    const res = await addPage(page, unique("three"));
    expect(res.status()).toBe(403);
    expect(await res.json()).toMatchObject({ code: "plan_limit" });
});

test("a suspended person's addresses stay taken after they delete the account", async ({
    page,
}) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    const first = await signUpToEditor(page);
    const second = unique("held");
    await addPage(page, second);
    const sql = postgres(TEST_DATABASE, { max: 1 });
    await sql`update users set suspended_at = now()
        where id = (select user_id from pages where handle = ${first})`;
    const removed = await page.request.delete("/api/v1/me", {
        data: { email: `${first}@example.com` },
    });
    expect(removed.status()).toBe(200);
    const held = await sql<{ handle: string; user_id: string }[]>`
        select handle, user_id from pages where handle in (${first}, ${second})`;
    await sql.end();
    expect(held.map((row) => row.handle).sort()).toEqual([first, second].sort());
    expect(new Set(held.map((row) => row.user_id)).size).toBe(1);
    expect(held[0]?.user_id).toMatch(/^removed:/);
});
