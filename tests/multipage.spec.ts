import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { addSection, canvas, draftUrl, signUpToEditor, setPlan } from "./helpers";
import { TEST_DATABASE } from "./setup-database";

const PAGES = "/api/v1/me/pages";

const addPage = (page: Page, handle: string) =>
    page.request.post(PAGES, { data: { name: "The Low Notes", handle } });

const unique = (word: string) => `${word}-${Date.now().toString(36)}${String(process.pid)}`;

async function saveWithLink(page: Page, id: string): Promise<string> {
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
    return ((await saved.json()) as { updatedAt: string }).updatedAt;
}

async function publishWithLink(page: Page, id: string) {
    const url = `${PAGES}/${id}`;
    const updatedAt = await saveWithLink(page, id);
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

const pressNewPage = async (page: Page) => {
    await page.locator("[data-page-switcher]:visible").click();
    await page.locator("[data-new-page]").click();
    await page.waitForURL(/\/app\/start\?page=/);
    await expect(page.locator("#start-name")).toBeVisible();
};

/** From the first step of the start flow to the address step. */
const walkToAddress = async (page: Page, name: string) => {
    await page.locator("#start-name").fill(name);
    for (let i = 0; i < 4; i++) await page.locator("[data-next]").click();
    await expect(page.locator("#start-handle")).toBeVisible();
};

const finishWalk = async (page: Page, handle: string) => {
    await page.locator("#start-handle").fill(handle);
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();
    await page.waitForURL(/\/app\/edit\?page=/);
    await expect(page.locator(".address")).toContainText(handle);
};

const addFromMenu = async (page: Page, name: string, handle: string) => {
    await pressNewPage(page);
    await walkToAddress(page, name);
    await finishWalk(page, handle);
};

const handles = async (page: Page) => {
    const list = (await (await page.request.get(PAGES)).json()) as {
        pages: { handle: string }[];
    };
    return list.pages.map((other) => other.handle);
};

test("New page goes through the start flow and leaves the other page alone", async ({ page }) => {
    const first = await signUpToEditor(page);
    const before = await (await page.request.get(await draftUrl(page))).text();
    await page.goto("/app/");
    await expect(page.locator(".pv iframe")).toBeVisible();
    await pressNewPage(page);
    await expect(page.locator(".flow h1")).toHaveText("Let's make your page");
    await expect(page.locator(".page-limit")).toHaveCount(0);
    if (isDesktop(page)) await expect(page.locator(".stage .phone")).toBeVisible();

    await page.locator("#start-name").fill("The Low Notes");
    await page.locator(".chip", { hasText: "A shop" }).click();
    await page.locator("[data-next]").click();
    await page.locator("[data-next]").click();
    await page.locator(".mark-t[data-mark=poster]").click();
    await page.locator("[data-next]").click();
    await page.locator(".tile[data-look=noir]").click();
    await page.locator("[data-next]").click();

    const box = page.locator("#start-handle");
    const note = page.locator("#start-note");
    await expect(box).toHaveValue("thelownotes");
    await box.fill(first);
    await expect(note).toHaveClass(/bad/);
    await expect(page.locator("[data-next]")).toBeDisabled();
    await box.fill("login");
    await expect(note).toHaveClass(/bad/);
    await expect(page.locator("[data-next]")).toBeDisabled();
    expect(await handles(page)).toEqual([first]);

    const second = unique("flow");
    await finishWalk(page, second);
    const frame = canvas(page);
    await expect(frame.locator("html")).toHaveClass(/noir/);
    await expect(frame.locator("#t-header h1")).toHaveAttribute("aria-label", "The Low Notes");
    await expect(frame.locator("#t-header .wm-poster")).toHaveCount(1);
    expect(await handles(page)).toEqual([first, second]);
    const me = (await (await page.request.get("/api/v1/me")).json()) as {
        pages: { id: string; handle: string }[];
    };
    const made = me.pages.find((other) => other.handle === second);
    expect(page.url()).toContain(`page=${made?.id ?? "missing"}`);
    const draft = (await (await page.request.get(`${PAGES}/${made?.id ?? ""}`)).json()) as {
        page: { timeZone?: string };
    };
    expect(draft.page.timeZone).toBeTruthy();
    expect(await (await page.request.get(await draftUrl(page))).text()).toBe(before);
});

test("Cancel returns to where New page was pressed, at any step, and adds nothing", async ({
    page,
}) => {
    const first = await signUpToEditor(page);
    await page.goto("/app/settings");
    await expect(page.locator("input[name=address]")).toHaveValue(first);
    await pressNewPage(page);
    await page.locator("[data-leave-flow]").click();
    await page.waitForURL(/\/app\/settings\?page=/);
    await expect(page.locator("input[name=address]")).toHaveValue(first);

    await page.goto("/app/");
    await expect(page.locator(".pv iframe")).toBeVisible();
    await pressNewPage(page);
    await walkToAddress(page, "Left halfway");
    await page.locator("[data-leave-flow]").click();
    await page.waitForURL(/\/app\/?\?page=/);
    await expect(page.locator(".addr")).toContainText(first);
    expect(await handles(page)).toEqual([first]);
});

test("New page in the builder saves first, and Cancel returns to the builder", async ({ page }) => {
    const first = await signUpToEditor(page);
    await page.goto("/app/edit");
    await expect(page.locator(".address")).toContainText(first);
    await addSection(page, "about");
    await page.locator("[data-page-switcher]:visible").click();
    await page.locator("[data-new-page]").click();
    await page.waitForURL(/\/app\/start\?page=.*back=%2Fedit/);
    await expect(page.locator("#start-name")).toBeVisible();
    const saved = (await (await page.request.get(await draftUrl(page))).json()) as {
        page: { blocks: object[] };
    };
    expect(saved.page.blocks.length).toBeGreaterThan(0);
    await page.locator("[data-leave-flow]").click();
    await page.waitForURL(/\/app\/edit\?page=/);
    await expect(page.locator(".address")).toContainText(first);
    expect(await handles(page)).toEqual([first]);
});

test("Back and reload in the start flow don't add a second page", async ({ page }) => {
    const first = await signUpToEditor(page);
    await page.goto("/app/");
    await expect(page.locator(".pv iframe")).toBeVisible();
    await pressNewPage(page);
    await walkToAddress(page, "Twice");
    await page.reload();
    await expect(page.locator("#start-name")).toBeVisible();
    expect(await handles(page)).toEqual([first]);

    await walkToAddress(page, "Twice");
    const second = unique("once");
    await finishWalk(page, second);
    await page.reload();
    await expect(page.locator(".address")).toContainText(second);
    await page.goBack();
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === "/app");
    await expect(page.locator("#start-name")).toHaveCount(0);
    expect(await handles(page)).toEqual([first, second]);
});

test("someone with pages who opens the start flow's address directly goes to Home", async ({
    page,
}) => {
    await signUpToEditor(page);
    for (const search of ["", "?page=not-a-page", "?handle=something"]) {
        await page.goto(`/app/start${search}`);
        await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === "/app");
        await expect(page.locator(".ph h1")).toBeVisible();
        await expect(page.locator(".page-limit")).toHaveCount(0);
    }
});

test("the start flow can't get round the limit", async ({ page }) => {
    const handle = await signUpToEditor(page, [], { plan: "free" });
    const me = (await (await page.request.get("/api/v1/me")).json()) as { pages: { id: string }[] };
    const id = me.pages[0]?.id ?? "";

    await page.goto(`/app/start?page=${id}&back=%2F`);
    await expect(page.locator("[data-page-limit=plan]")).toBeVisible();
    await expect(page.locator("#start-name")).toHaveCount(0);
    expect(page.url()).not.toContain("limit=");

    await page.goto("/app/settings");
    await page.locator("[data-copy-page]").click();
    await expect(page.locator("[data-page-limit=plan]")).toBeVisible();
    await page.locator("[data-keep-editing]").click();
    await expect(page.locator("[name=page-address]")).toHaveCount(0);

    await setPlan(handle, "pro");
    await page.goto(`/app/start?page=${id}&back=%2F`);
    await walkToAddress(page, "Too late");
    await setPlan(handle, "free");
    await page.locator("#start-handle").fill(unique("late"));
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();
    await expect(page.locator("#start-note")).toContainText("all the pages your plan allows");
    await expect(page.locator("[data-next]")).toBeDisabled();
    expect(await handles(page)).toEqual([handle]);
});

test("the switcher adds and moves between pages, and the screens follow it", async ({ page }) => {
    const first = await signUpToEditor(page);
    const second = unique("band");
    await page.goto("/app/");
    await expect(page.locator(".pv iframe")).toBeVisible();
    await addFromMenu(page, "The Low Notes", second);

    await page.locator("[data-page-switcher]").click();
    await expect(page.locator("[data-page-item]")).toHaveCount(2);
    await expect(page.locator(".psw-new")).toContainText("2 of 5");
    await page.keyboard.press("Escape");
    await page.locator(".tohome").click();
    await expect(page.locator(".addr")).toContainText(second);
    await expect(page.locator(".ph h1")).toContainText("Hello");

    await page.locator("[data-page-switcher]:visible").click();
    await page.locator(`[data-page-item=${first}]`).click();
    await expect(page.locator(".addr")).toContainText(first);
    expect(page.url()).toContain("page=");

    const settings = page.url().replace(/\/app\/?\?/, "/app/settings?");
    await page.goto(settings);
    await expect(page.locator("input[name=address]")).toHaveValue(first);
    await page.locator("[data-page-switcher]:visible").click();
    await page.locator(`[data-page-item=${second}]`).click();
    await expect(page.locator("input[name=address]")).toHaveValue(second);
    await expect(page.locator("[data-edit-page]")).toHaveAttribute("href", /\/app\/edit\?page=/);
});

test("the pencil sits with the address buttons, and a phone keeps its bottom bar", async ({
    page,
}, info) => {
    await signUpToEditor(page);
    await page.goto("/app/");
    await expect(page.locator(".pv iframe")).toBeVisible();
    if (info.project.name === "phone") {
        await expect(page.locator(".pen")).toBeHidden();
        await expect(page.locator(".bottom .ed")).toBeVisible();
        await expect(page.locator(".bar [data-page-switcher]")).toBeVisible();
        return;
    }
    const pencil = page.getByRole("link", { name: "Edit page" });
    await expect(pencil).toHaveAttribute("title", "Edit page");
    await expect(page.locator(".status-acts .pen")).toBeVisible();
    await expect(page.locator(".pv .pen")).toHaveCount(0);
    await pencil.click();
    await page.waitForURL(/\/app\/edit\?page=/);
});

test("New page on Free offers a plan, and at the limit says to delete one", async ({ page }) => {
    const handle = await signUpToEditor(page, [], { plan: "free" });
    await page.goto("/app/");
    await page.locator("[data-page-switcher]:visible").click();
    await expect(page.locator(".psw-new")).toContainText("1 of 1");
    await page.locator("[data-new-page]").click();
    await expect(page.locator("[data-page-limit=plan]")).toContainText("free to keep building");
    await expect(page.locator("[data-plan=starter]")).toBeVisible();
    await page.locator("[data-keep-editing]").click();
    await expect(page.locator(".page-limit")).toHaveCount(0);
    await expect(page.locator("#start-name")).toHaveCount(0);

    await setPlan(handle, "pro");
    for (const word of ["two", "three", "four", "five"]) {
        expect((await addPage(page, unique(word))).status()).toBe(201);
    }
    await page.reload();
    await page.locator("[data-page-switcher]:visible").click();
    await page.locator("[data-new-page]").click();
    await expect(page.locator("[data-page-limit=all]")).toContainText(
        "You're using all 5 pages. Delete one to add another.",
    );
});

test("Page settings copies and deletes this page", async ({ page }) => {
    const first = await signUpToEditor(page);
    await page.goto("/app/settings");
    await expect(page.locator("[data-delete-page]")).toHaveCount(0);
    await page.locator("[data-copy-page]").click();
    await expect(page.locator("[name=page-name]")).toHaveValue("Maya Okafor");
    const copy = unique("copy");
    await page.locator("[name=page-address]").fill(copy);
    await expect(page.locator("[data-address-note]")).toContainText("free");
    await page.locator("[data-create-page]").click();
    await page.waitForURL(/\/app\/edit\?page=/);
    await expect(page.locator(".address")).toContainText(copy);
    await expect(canvas(page).locator("#t-header h1")).toContainText("Maya Okafor");

    const settings = page.url().replace("/edit?", "/settings?");
    await page.goto(settings);
    await page.locator("[data-delete-page]").click();
    await page.locator("[data-delete-page-yes]").click();
    await expect(page.locator("input[name=address]")).toHaveValue(first);
    expect((await page.request.get(`/api/v1/handles/${copy}`)).status()).toBe(200);
    const check = (await (await page.request.get(`/api/v1/handles/${copy}`)).json()) as {
        available: boolean;
    };
    expect(check.available).toBe(true);
});

test("two pages keep their own work, across two tabs", async ({ page, context }) => {
    const first = await signUpToEditor(page);
    const me = (await (await page.request.get("/api/v1/me")).json()) as { pages: { id: string }[] };
    const firstId = me.pages[0]?.id ?? "";
    const second = unique("tab");
    const { id } = (await (await addPage(page, second)).json()) as { id: string };
    const other = await context.newPage();
    await other.goto(`/app/edit?page=${id}`);
    await expect(other.locator(".address")).toContainText(second);
    const url = `${PAGES}/${id}`;
    const draft = (await (await other.request.get(url)).json()) as {
        page: { header: object };
        updatedAt: string;
    };
    const saved = await other.request.put(url, {
        data: {
            updatedAt: draft.updatedAt,
            page: { ...draft.page, header: { ...draft.page.header, name: "Only here" } },
        },
    });
    expect(saved.status()).toBe(200);
    await expect(page.locator(".address")).toContainText(first);
    await page.goto(`/app/edit?page=${firstId}`);
    await expect(page.locator(".address")).toContainText(first);
    await expect(canvas(page).locator("h1")).not.toContainText("Only here");
    await other.close();
});

test("a second page on Starter offers Pro when publishing", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await setPlan(handle, "starter");
    const me = (await (await page.request.get("/api/v1/me")).json()) as { pages: { id: string }[] };
    await publishWithLink(page, me.pages[0]?.id ?? "");
    const { id } = (await (await addPage(page, unique("extra"))).json()) as { id: string };
    await saveWithLink(page, id);
    const check = (await (await page.request.get(`${PAGES}/${id}/check`)).json()) as {
        issues: { plan?: string }[];
    };
    expect(check.issues.some((issue) => issue.plan === "pro")).toBe(true);
    await page.goto(`/app/edit?page=${id}&panel=publish`);
    await expect(page.locator("[data-plan=pro]")).toBeVisible();
});

const ONE_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
);

test("two pages' image addresses have different folders", async ({ page }) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    await signUpToEditor(page);
    const me = (await (await page.request.get("/api/v1/me")).json()) as { pages: { id: string }[] };
    const first = me.pages[0]?.id ?? "";
    const { id } = (await (await addPage(page, unique("pics"))).json()) as { id: string };
    const upload = async (pageId: string) => {
        const res = await page.request.post(`/api/v1/me/photos?page=${pageId}`, {
            multipart: {
                photo: { name: "me.png", mimeType: "image/png", buffer: ONE_PIXEL },
            },
        });
        expect(res.status()).toBe(201);
        return ((await res.json()) as { file: string }).file;
    };
    const one = await upload(first);
    const two = await upload(id);
    expect(one.split("/")[1]).not.toBe(two.split("/")[1]);
    const list = await page.request.get("/api/v1/me/photos");
    expect(((await list.json()) as { files: string[] }).files.sort()).toEqual([one, two].sort());
});

test("a second page sends no script, and the sitemap lists live pages only", async ({
    page,
    request,
}) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    const first = await signUpToEditor(page);
    const second = unique("nojs");
    const { id } = (await (await addPage(page, second)).json()) as { id: string };
    await publishWithLink(page, id);
    const html = await (await request.get(`/${second}`)).text();
    expect(html).not.toContain("<script");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain(`/${second}</loc>`);
    expect(xml).not.toContain(`/${first}</loc>`);
    expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test("changing a page's address leaves the other working", async ({ page, request }) => {
    test.skip(!isDesktop(page), "The API doesn't depend on the screen");
    await signUpToEditor(page);
    const a = unique("keep");
    const b = unique("old");
    const one = (await (await addPage(page, a)).json()) as { id: string };
    const two = (await (await addPage(page, b)).json()) as { id: string };
    await publishWithLink(page, one.id);
    await publishWithLink(page, two.id);
    const next = unique("new");
    await page.request.patch(`${PAGES}/${two.id}/handle`, { data: { handle: next } });
    expect((await request.get(`/${a}`)).status()).toBe(200);
    expect((await request.get(`/${b}`)).status()).toBe(404);
    expect((await request.get(`/${next}`)).status()).toBe(200);
});

test("the switcher shows each page by its photo, or its look and first letter", async ({
    page,
}) => {
    const first = await signUpToEditor(page);
    const me = (await (await page.request.get("/api/v1/me")).json()) as {
        pages: { id: string }[];
    };
    const url = `${PAGES}/${me.pages[0]?.id ?? ""}`;
    const draft = (await (await page.request.get(url)).json()) as {
        page: { header: object };
        updatedAt: string;
    };
    const saved = await page.request.put(url, {
        data: {
            updatedAt: draft.updatedAt,
            page: {
                ...draft.page,
                header: { ...draft.page.header, photo: { file: "woman23.jpg" } },
            },
        },
    });
    expect(saved.ok()).toBe(true);
    const second = unique("loud");
    const made = await addPage(page, second);
    const { id } = (await made.json()) as { id: string };
    const loud = (await (await page.request.get(`${PAGES}/${id}`)).json()) as {
        page: object;
        updatedAt: string;
    };
    await page.request.put(`${PAGES}/${id}`, {
        data: { updatedAt: loud.updatedAt, page: { ...loud.page, look: "signal" } },
    });
    await page.goto("/app/");
    const switcher = page.locator("[data-page-switcher]:visible");
    await switcher.click();
    const tile = (handle: string) => page.locator(`[data-page-item="${handle}"]:visible .psw-tile`);
    await expect(tile(first)).toHaveCSS("background-image", /woman23\.jpg/);
    await expect(tile(first).locator("em")).toHaveCount(0);
    await expect(tile(second)).toHaveCSS("background-image", /looks\/signal\.jpg/);
    await expect(tile(second).locator("em")).toHaveText("T");
    await expect(tile(second)).toHaveCSS("border-radius", "10px");
    await expect(tile(second)).toHaveCSS("border-top-width", "1px");
});
