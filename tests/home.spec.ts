import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, signUpToEditor, draftUrl } from "./helpers";

/** Puts a real button on the page, so it has something to publish. */
async function addContent(page: Page) {
    await page.evaluate(
        async (draftUrl) => {
            const draft = (await (await fetch(draftUrl)).json()) as {
                page: { blocks: unknown[] };
                updatedAt: string;
            };
            const blocks = [
                ...draft.page.blocks,
                {
                    id: "b1",
                    type: "button",
                    variant: "filled",
                    text: "Shop",
                    url: "https://a.example.com",
                },
            ];
            await fetch(draftUrl, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    page: { ...draft.page, blocks },
                    updatedAt: draft.updatedAt,
                }),
            });
        },
        await draftUrl(page),
    );
}

test("a new page lands in the builder, then Home shows what's left to do", async ({ page }) => {
    const handle = await signUpToEditor(page);
    await expect(page).toHaveURL(/\/app\/edit/);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });

    await page.goto("/app");
    await expect(page.locator(".ph h1")).toContainText("Hello");
    await expect(page.locator(".tag")).toContainText("Not live yet");
    await expect(page.locator(".addr")).toContainText(handle);
    await expect(page.locator(".check li")).toHaveCount(5);
    await expect(page.locator(".check")).not.toContainText("Choose a look");
    await expect(page.locator(".pv iframe")).toBeVisible();
    await expect(page.locator("[data-views]")).toHaveCount(0);
    await expect(page.locator(".pv iframe").contentFrame().locator("h1")).toContainText(
        "Maya Okafor",
    );
});

test("logging in lands on Home, and a person with no address goes to the start flow", async ({
    page,
}) => {
    await signUpToEditor(page);
    await page.goto("/app/start");
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === "/app");
    await expect(page.locator(".ph h1")).toBeVisible();
});

test("each checklist item opens the builder at the exact thing", async ({ page }) => {
    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.goto("/app");
    await page.locator("[data-check=socials]").click();
    await page.waitForURL(/\/app\/edit/);
    await expect(page.locator(".side").filter({ hasText: "Your name and links" })).toBeVisible();

    await page.goto("/app");
    await page.locator("[data-check=publish]").click();
    await page.waitForURL(/\/app\/edit/);
    await expect(page.locator(".pub")).toBeVisible();
    // The link only opens the panel. Publishing still takes a press.
    await expect(page.locator(".pub-address")).toHaveCount(0);
});

test("the sidebar reaches every page and the builder leads back", async ({ page, isMobile }) => {
    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.locator(".tohome").click();
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === "/app");
    const open = async (name: string) => {
        if (isMobile && name !== "Analytics") {
            await page.locator(".bottom button").click();
            await page.locator(".sheet").getByRole("link", { name }).click();
        } else {
            await page
                .locator(isMobile ? ".bottom" : ".side")
                .getByRole("link", { name })
                .click();
        }
    };
    await open("Analytics");
    await expect(page.locator(".ph h1")).toHaveText("Analytics");
    await expect(page.locator(".emptyline").first()).toContainText("Nothing yet");
    await open("Page settings");
    await expect(page.locator(".ph h1")).toHaveText("Page settings");
    await open("Account");
    await expect(page.locator(".ph h1")).toHaveText("Account");
    await page.goBack();
    await expect(page.locator(".ph h1")).toHaveText("Page settings");
});

test("publish, numbers, take down and a new address all work from the dashboard", async ({
    page,
    request,
}) => {
    const handle = await signUpToEditor(page);
    await canvas(page).locator("h1").waitFor();
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await addContent(page);
    await page.goto("/app/edit?panel=publish");
    await page.locator(".pub .go").click();
    await expect(page.locator(".pub-address")).toContainText(handle);

    await request.get(`/${handle}`);
    await request.head(`/${handle}`);
    await expect
        .poll(async () => {
            const res = await page.request.get(`${await draftUrl(page)}/stats`);
            return ((await res.json()) as { views: number }).views;
        })
        .toBe(1);
    await page.goto("/app");
    await expect(page.locator(".tag")).toHaveText("Live");
    await expect(page.locator("[data-views]")).toHaveText("1");

    await page.goto("/app/analytics");
    await expect(page.locator(".tile").first()).toContainText("1");
    await expect(page.locator(".chart svg")).toBeVisible();
    await page.getByRole("button", { name: "Show table" }).click();
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    await page.goto("/app/settings");
    const next = `${handle}-new`.slice(0, 30);
    await page.locator("input[name=address]").fill(next);
    await page.getByRole("button", { name: "Change address" }).click();
    await expect(page.locator(".toast-s")).toContainText(next);
    expect((await request.get(`/${handle}`)).status()).toBe(404);
    expect((await request.get(`/${next}`)).status()).toBe(200);

    await page.locator(".unpublish").click();
    await page.locator(".unpublish-yes").click();
    await expect(page.locator(".unpublish-yes, .unpublish")).toHaveCount(0);
    expect((await request.get(`/${next}`)).status()).toBe(404);
});

test("changing a password and deleting an account work", async ({ page, request }) => {
    const handle = await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.goto("/app/account");
    await page.locator("input[name=current]").fill("long enough pass");
    await page.locator("input[name=new]").fill("another long pass");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.locator(".toast-s")).toContainText("Password changed");

    await expect(page.locator(".delete-account")).toBeDisabled();
    await page.locator("input[name=confirm]").fill(`${handle}@example.com`);
    await page.locator(".delete-account").click();
    await expect(page.locator(".empty h2")).toHaveText("Your account is gone");
    expect((await request.get(`/${handle}`)).status()).toBe(404);
});

test("unsaved work from an older version can be restored or thrown away", async ({ page }) => {
    await signUpToEditor(page);
    const pageId = (await draftUrl(page)).split("/").pop() ?? "";
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.evaluate((name) => {
        localStorage.setItem(
            `tondo-unsaved-v3:${name}:other`,
            JSON.stringify({
                page: { version: 99, nonsense: true },
                base: "2020-01-01T00:00:00.000Z",
            }),
        );
    }, pageId);
    await page.reload();
    await expect(page.locator(".recover")).toHaveCount(0);

    const good = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            return ((await res.json()) as { page: unknown }).page;
        },
        await draftUrl(page),
    );
    await page.evaluate(
        ({ name, saved }) => {
            localStorage.setItem(
                `tondo-unsaved-v3:${name}:other`,
                JSON.stringify({
                    page: { ...(saved as object), title: "From the older tab" },
                    base: "2020-01-01T00:00:00.000Z",
                }),
            );
        },
        { name: pageId, saved: good },
    );
    await page.reload();
    await expect(page.locator(".recover")).toContainText("unsaved work");
    await page.locator(".recover-restore").click();
    await expect(page.locator(".recover")).toHaveCount(0);
    const after = await page.evaluate(
        async (draftUrl) => {
            const res = await fetch(draftUrl);
            return ((await res.json()) as { page: { title?: string } }).page.title;
        },
        await draftUrl(page),
    );
    expect(after).toBe("From the older tab");
});

test("the large phone leads Home, with no edit button on it, and Edit stays in reach", async ({
    page,
    isMobile,
}) => {
    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.goto("/app");
    const phone = await page.locator(".pv .phone").boundingBox();
    await expect(page.locator(".pv")).not.toContainText("Edit");
    if (isMobile) {
        expect(phone?.width).toBeGreaterThan(300);
        await expect(page.locator(".bottom .ed")).toBeVisible();
        const scroll = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(scroll).toBeLessThanOrEqual(0);
    } else {
        const side = await page.locator(".home-side").boundingBox();
        const home = await page.locator(".home").boundingBox();
        if (!phone || !side || !home) throw new Error("Home has no size.");
        expect(phone.width).toBeGreaterThan(380);
        expect(phone.height).toBeGreaterThan(700);
        expect(side.x - (phone.x + phone.width)).toBeGreaterThanOrEqual(60);
        expect(side.width).toBeLessThanOrEqual(620);
        const middle = home.y + home.height / 2;
        expect(Math.abs(phone.y + phone.height / 2 - middle)).toBeLessThan(2);
        expect(Math.abs(side.y + side.height / 2 - middle)).toBeLessThan(2);
        expect(side.x - (phone.x + phone.width)).toBeLessThanOrEqual(72);
        await expect(page.locator(".side [data-page-switcher]")).toBeVisible();
        const pencil = await page.locator(".pen").boundingBox();
        expect(pencil?.x ?? 0).toBeGreaterThanOrEqual(phone.x + phone.width);
    }
});

test("Home, the builder and the preview show the phone at the same size", async ({
    page,
    isMobile,
}) => {
    test.skip(isMobile, "On a phone, the builder fills the screen.");
    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    const builder = await page.locator(".build .phone").boundingBox();
    await page.locator(".preview-open").click();
    const preview = await page.locator(".preview .phone").boundingBox();
    await page.goto("/app");
    const home = await page.locator(".pv .phone").boundingBox();
    expect(home?.height).toBe(builder?.height);
    expect(home?.width).toBe(builder?.width);
    expect(preview?.height).toBe(builder?.height);
});

test("the app's logo leads to the site, which offers the way back", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav a[data-guest]", { hasText: "Log in" }).first()).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Go to app" })).toBeHidden();

    await signUpToEditor(page);
    await page.locator(".saved[data-state=saved]").waitFor({ state: "attached" });
    await page.goto("/app");
    await page.locator("a.logo:visible").click();
    await expect(page).toHaveURL(/\/$/);
    const back = page.locator("nav a", { hasText: "Go to app" });
    await expect(back).toBeVisible();
    await expect(page.locator("a[data-guest]:visible", { hasText: "Log in" })).toHaveCount(0);
    await expect(page.locator("nav a[data-guest]", { hasText: "Get started" })).toBeHidden();

    await back.click();
    await expect(page).toHaveURL(/\/app\/?$/);
});
