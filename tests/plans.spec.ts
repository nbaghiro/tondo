import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { PORTS } from "../scripts/ports";
import { canvas, openLook, panel, setPlan, signUpToEditor, draftUrl } from "./helpers";

// A page with something of its own on it, so publishing has nothing else to ask about.
const withWords = async (page: Page, options: { plan?: string } = {}) => {
    const handle = await signUpToEditor(page, [], options);
    await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            const { page: draft, updatedAt } = (await res.json()) as {
                page: Record<string, unknown> & { header: Record<string, unknown> };
                updatedAt: string;
            };
            await fetch(draftUrl, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    page: { ...draft, header: { ...draft.header, bio: "Hello" } },
                    updatedAt,
                }),
            });
        },
        await draftUrl(page),
    );
    await page.reload();
    await expect(page.locator(".address")).toContainText(handle);
    return handle;
};

const DAY = 86_400_000;
// How long a visitor's page can come from the cache, plus a little.
const CACHE_MS = 16_000;

const publishFromPanel = async (page: Page) => {
    await page.locator(".publish").click();
    await expect(page.locator(".pub-address")).toBeVisible();
};

const ONE_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==",
    "base64",
);

test("a photo can be removed, and not while it's on the page", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await canvas(page).locator("#t-header").click();
    await panel(page).locator(".ph-empty").first().click();
    await page.locator(".upload input").setInputFiles({
        name: "me.png",
        mimeType: "image/png",
        buffer: ONE_PIXEL,
    });
    await expect(canvas(page).locator("#t-header img")).toHaveAttribute("src", /uploads/);
    await panel(page).locator(".ph .mini").first().click();
    await expect(page.locator(".photo-count")).toHaveText(/^\s*1 of 25\s*$/);

    await expect(page.locator(".saved.status")).toHaveAttribute("data-state", "saved");
    await page.locator(".mine-x").click();
    await expect(page.locator(".picker .fd-e")).toHaveText(
        "This photo is on your page. Take it off first.",
    );
    await expect(page.locator(".pick-mine .mine")).toHaveCount(1);
});

test("Free asks for any range of statistics", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    const answer = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(`${draftUrl}/stats?days=90`);
            return (await res.json()) as { range: number; days: unknown[] };
        },
        await draftUrl(page),
    );
    expect(answer.range).toBe(90);
    expect(answer.days).toHaveLength(90);
});

test("Free can use any look or section, with no labels, and can't go live", async ({ page }) => {
    const handle = await withWords(page, { plan: "free" });
    await openLook(page);
    const tile = page.locator(".tile[data-look=bake]");
    await expect(tile).toHaveAttribute("aria-label", "Bakehouse look");
    await tile.click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".saved.status")).toHaveAttribute("data-state", "saved");
    await expect(page.locator("body")).not.toContainText("part of Pro");

    const address = await draftUrl(page);
    const status = await page.evaluate(async (draftUrl) => {
        const { updatedAt } = (await (await fetch(draftUrl)).json()) as { updatedAt: string };
        const res = await fetch(`${draftUrl}/publish`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ updatedAt }),
        });
        return res.status;
    }, address);
    expect(status).toBe(422);
    const visit = await page.request.get(`/${handle}`);
    expect(visit.status()).toBe(404);
    expect(await visit.text()).toContain("no page here");
});

test("publishing on Free offers both plans, and going back leaves everything as it was", async ({
    page,
}) => {
    const handle = await withWords(page, { plan: "free" });
    await expect(page.locator(".address")).toContainText(handle);
    await page.locator(".publish").click();
    const prompt = page.locator("[data-plan-panel]");
    await expect(prompt).toContainText(`online at tondo.page/${handle}`);
    await expect(prompt.locator("[data-plan=starter]")).toContainText("$5 a month");
    await expect(prompt.locator("[data-plan=pro]")).toContainText("$12 a month");
    await prompt.locator("[data-period=year]").click();
    await expect(prompt.locator("[data-plan=starter]")).toContainText("$48 a year");
    await expect(prompt.locator("[data-plan=pro]")).toContainText("$120 a year");
    await prompt.locator("[data-keep-editing]").click();
    await expect(prompt).toHaveCount(0);
    await expect(page.locator(".address")).toContainText(handle);
});

test("Home says plainly what Free does and what visitors see", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await page.goto("/app");
    await expect(page.locator("[data-plan-notice]")).toContainText("free");
    await expect(page.locator(".home")).toContainText("no page here");
});

const publishIt = async (page: Page, handle: string) => {
    await publishFromPanel(page);
    await expect(page.locator(".pub-address")).toContainText(handle);
};

test("a plan ending takes the page offline, keeps the content, and subscribing restores it", async ({
    page,
}) => {
    test.setTimeout(90_000);
    const handle = await withWords(page);
    await publishIt(page, handle);
    const visit = () => page.request.get(`/${handle}`);
    expect((await visit()).status()).toBe(200);
    expect(await (await visit()).text()).toContain("Made with Tondo");

    await setPlan(handle, "pro", new Date(Date.now() - DAY));
    await page.waitForTimeout(CACHE_MS);
    const gone = await visit();
    expect(gone.status()).toBe(404);
    const plain = await gone.text();
    expect(plain).toContain("no page here");
    expect(plain).not.toContain("Maya Okafor");
    await page.goto("/app");
    await expect(page.locator(".tag")).toContainText("Offline");
    await expect(page.locator("[data-plan-notice]")).toContainText("so this page is offline");
    await expect(page.locator("[data-plan-notice]")).toContainText("choose a plan in Account");
    const draft = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            const body = (await res.json()) as {
                published: boolean;
                offline: boolean;
                page: { header: { bio: string } };
            };
            return { ...body, bio: body.page.header.bio };
        },
        await draftUrl(page),
    );
    expect(draft).toMatchObject({ published: true, offline: true, bio: "Hello" });

    await setPlan(handle, "starter");
    await page.waitForTimeout(CACHE_MS);
    const back = await visit();
    expect(back.status()).toBe(200);
    expect(await back.text()).toContain("Hello");
});

test("visitors can't follow a link on a page that's offline", async ({ page }) => {
    const handle = await signUpToEditor(page, [], { plan: "free" });
    expect((await page.request.get(`/l/${handle}/anything`)).status()).toBe(404);
});

const customerOf = async (handle: string) => {
    const sql = postgres(`postgres://tondo:tondo@127.0.0.1:${String(PORTS.postgres)}/tondo_test`, {
        max: 1,
    });
    const [row] = await sql<
        { stripe_id: string | null }[]
    >`select stripe_id from users where id = (select user_id from pages where handle = ${handle})`;
    await sql.end();
    return row?.stripe_id ?? "";
};
const control = (action: string, customer: string) =>
    fetch(
        `http://127.0.0.1:${String(PORTS.testNeon)}/stripe-control/${action}?customer=${customer}`,
    );

const choosePlanAndPay = async (page: Page, plan = "pro", button = "#pay") => {
    const handle = await withWords(page, { plan: "free" });
    await page.locator(".publish").click();
    await page.locator(`[data-plan=${plan}]`).click();
    await page.locator(button).click();
    await expect(page.locator("[data-paid-note]")).toContainText(
        `You're on ${plan === "pro" ? "Pro" : "Starter"}.`,
    );
    return handle;
};

test("paying at publish gives the plan and then the person publishes", async ({ page }) => {
    const handle = await choosePlanAndPay(page, "starter");
    await expect(page.locator(".pub .go").last()).toBeVisible();
    await page.locator(".pub .go").last().click();
    await expect(page.locator(".pub-address")).toContainText(handle);
    expect((await page.request.get(`/${handle}`)).status()).toBe(200);
});

test("the yearly choice reaches checkout", async ({ page }) => {
    await withWords(page, { plan: "free" });
    await page.locator(".publish").click();
    await page.locator("[data-period=year]").click();
    await page.locator("[data-plan=pro]").click();
    await expect(page.locator("#price-key")).toHaveText("pro_year");
});

test("coming back from paying is enough, even with no event", async ({ page }) => {
    await choosePlanAndPay(page, "pro", "#pay-quiet");
});

test("New page on Starter offers Pro, and moving up lets a second page go live", async ({
    page,
}) => {
    const handle = await choosePlanAndPay(page, "starter");
    await page.locator(".pub .go").last().click();
    await expect(page.locator(".pub-address")).toContainText(handle);

    await page.goto("/app/");
    await page.locator("[data-page-switcher]:visible").click();
    await page.locator("[data-new-page]").click();
    const prompt = page.locator("[data-page-limit=plan]");
    await expect(prompt).toContainText("Move to Pro");
    await expect(prompt.locator("[data-plan=starter]")).toHaveCount(0);
    await prompt.locator("[data-plan=pro]").click();
    await page.locator("#confirm-change").click();
    await expect(page.locator("[data-plan-summary]")).toContainText("Pro");
    const made = await page.request.post("/api/v1/me/pages", {
        data: { name: "Band", handle: `${handle}-band` },
    });
    expect(made.status()).toBe(201);
});

test("Account adds 5 more pages through Stripe, and the plan follows", async ({ page }) => {
    await choosePlanAndPay(page, "pro");
    await page.goto("/app/account");
    await expect(page.locator("[data-plan-summary]")).toContainText("trying Pro");
    await page.locator("[data-add-pages]").click();
    await page.locator("#confirm-change").click();
    await expect(page.locator("[data-pages-plan]")).toContainText("You have 10 live pages");
    const me = (await (await page.request.get("/api/v1/me")).json()) as {
        limits: { credits: number };
    };
    expect(me.limits.credits).toBe(600);
});

test("the trial is once per account, and a page can hide the badge", async ({ page }) => {
    const handle = await choosePlanAndPay(page, "pro");
    await page.locator(".pub .go").last().click();
    await expect(page.locator(".pub-address")).toContainText(handle);
    expect(await (await page.request.get(`/${handle}`)).text()).toContain("Made with Tondo");

    await page.goto("/app/settings");
    await page.locator("[data-show-badge]").uncheck();
    await page.locator('input[name="title"]').fill("Maya");
    await page.locator('form:has(input[name="title"]) button[type=submit]').click();
    await expect(page.getByText("Saved")).toBeVisible();
    const draftAt = await draftUrl(page);
    const draft = (await (await page.request.get(draftAt)).json()) as { updatedAt: string };
    const done = await page.request.post(`${draftAt}/publish`, {
        data: { updatedAt: draft.updatedAt },
    });
    expect(done.status()).toBe(204);
    expect(await (await page.request.get(`/${handle}`)).text()).not.toContain("Made with Tondo");

    const billing = (await (await page.request.get("/api/v1/me/billing")).json()) as object;
    expect(billing).toMatchObject({ trialLeft: false });
});

test("cancelling at the payment page loses nothing", async ({ page }) => {
    await withWords(page, { plan: "free" });
    await page.locator(".publish").click();
    await page.locator("[data-plan=pro]").click();
    await page.locator("#cancel").click();
    await expect(page.locator("[data-plan-panel]")).toContainText("A plan puts it");
});

test("failing keeps the page up, and ending through the webhook takes it offline", async ({
    page,
}) => {
    test.setTimeout(60_000);
    const handle = await choosePlanAndPay(page);
    await page.locator(".pub .go").last().click();
    await expect(page.locator(".pub-address")).toContainText(handle);
    const customer = await customerOf(handle);

    await control("fail", customer);
    await page.goto("/app/account");
    await expect(page.locator("[data-payment-failing]")).toBeVisible();
    await expect(page.locator("[data-plan-summary]")).toContainText("You're on Pro");
    expect((await page.request.get(`/${handle}`)).status()).toBe(200);

    await control("twice", customer);
    await control("end", customer);
    await page.goto("/app/account");
    await expect(page.locator("[data-plan-summary]")).toContainText("Your plan has ended");
    expect((await page.request.get(`/${handle}`)).status()).toBe(404);
    await expect(page.locator("[data-plan-choice] [data-plan=starter]")).toBeVisible();
});

test("a bad signature is refused", async ({ page }) => {
    const res = await page.request.post("/api/stripe/webhook", {
        headers: { "stripe-signature": "t=1,v1=nope" },
        data: "{}",
    });
    expect(res.status()).toBe(400);
});

test("deleting an account cancels its plan", async ({ page }) => {
    const handle = await choosePlanAndPay(page);
    const customer = await customerOf(handle);
    await page.goto("/app/account");
    await expect(page.locator(".fs", { hasText: "Delete account" })).toContainText(
        "cancels your plan straight away",
    );
    await page.locator("input[name=confirm]").fill(`${handle}@example.com`);
    await page.locator(".delete-account").click();
    await expect(page.locator(".empty h2")).toHaveText("Your account is gone");
    const left = (await (await control("look", customer)).json()) as { active: number };
    expect(left.active).toBe(0);
});
