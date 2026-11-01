import { expect, test } from "@playwright/test";

test.describe("the gallery", () => {
    test("shows every example page, drawn by the real renderer", async ({ page }) => {
        await page.goto("/gallery");
        await expect(page.locator(".exgrid .ex")).toHaveCount(50);
        await page.goto("/mayaokafor");
        await expect(page.locator("h1")).toHaveText("Maya Okafor");
        await expect(page.locator(".b-feature, .b-f-large").first()).toBeVisible();
        const broken = await page.evaluate(async () => {
            const images = [...document.images];
            await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
            return images.filter((image) => !image.naturalWidth).map((image) => image.src);
        });
        expect(broken).toEqual([]);
    });

    test("addresses are lowercase, whatever someone types", async ({ request }) => {
        const res = await request.get("/MayaOkafor", { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(res.headers()["location"]).toBe("/mayaokafor");
    });

    test("the filmstrip can be paused", async ({ page }) => {
        await page.goto("/");
        const position = () =>
            page.locator(".ex-track").evaluate((track) => getComputedStyle(track).transform);
        const pause = page.locator("[data-pause]");
        await pause.scrollIntoViewIfNeeded();
        await pause.click();
        await expect(pause).toHaveText("Play");
        await page.waitForTimeout(1500);
        const stopped = await position();
        await page.waitForTimeout(500);
        expect(await position()).toBe(stopped);
    });

    test("the blocks section uses real blocks", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator(".bk")).toHaveCount(9);
        await expect(page.locator(".bk-in .b-player")).toHaveCount(1);
    });
});

test("example pages keep everything, even words that match a section's sample", async ({
    page,
}) => {
    // Their words were the source of some samples, and they're drawn in full, never as "live".
    await page.goto("/mayaokafor");
    await expect(page.locator("main")).toContainText("Tall ash vase");
    await page.goto("/harbourbakery");
    await expect(page.locator("main")).toContainText("Tue to Fri");
});

test.describe("the teams and pricing pages", () => {
    test("each has its own address, reached from the footer", async ({ page }) => {
        await page.goto("/");
        await page.locator('.foot a[href="/teams"]').click();
        await expect(page).toHaveURL(/\/teams$/);
        await expect(page.locator("h1")).toContainText("one look for the team");
        await page.locator('.foot a[href="/pricing"]').click();
        await expect(page).toHaveURL(/\/pricing$/);
        await expect(page.locator("h1")).toHaveText("Everything in Tondo is free today");
    });

    test("the nav goes to the pages, and Home links to both", async ({ page }, testInfo) => {
        await page.goto("/");
        await expect(page.locator('#teams a[href="/teams"]')).toBeVisible();
        await expect(page.locator('#pricing a[href="/pricing"]')).toBeVisible();
        await expect(page.locator("#pricing")).not.toContainText("All block types");
        // The phone layout hides these nav links and relies on the footer.
        test.skip(testInfo.project.name === "phone");
        await page.locator('nav a.navlink[href="/teams"]').first().click();
        await expect(page).toHaveURL(/\/teams$/);
        await page.locator('nav a.navlink[href="/pricing"]').first().click();
        await expect(page).toHaveURL(/\/pricing$/);
    });

    test("teams says it's coming, and registering interest sends an email", async ({ page }) => {
        await page.goto("/teams");
        await expect(page.locator(".t-hero .st")).toHaveText("Coming");
        await expect(page.locator("[data-interest]")).toHaveAttribute(
            "href",
            /^mailto:hello@tondo\.page/,
        );
    });

    test("the Team section leads to each person's page", async ({ page }) => {
        await page.goto("/teams");
        await page.locator('.t-block a[href="/raebell"]').click();
        await expect(page).toHaveURL(/\/raebell$/);
        await expect(page.locator("h1")).toHaveText("Rae Bell");
    });

    test("choosing a look changes all the example pages at once", async ({ page }) => {
        await page.goto("/teams");
        const background = () =>
            page
                .locator(".ml")
                .first()
                .evaluate((el) => getComputedStyle(el).backgroundColor);
        const before = await background();
        await page.locator('[data-look="dusk"]').click();
        await expect(page.locator('[data-look="dusk"]')).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("[data-look-now]")).toHaveText("Dusk");
        await expect.poll(background).not.toBe(before);
    });

    test("the look demonstration works from the keyboard", async ({ page }) => {
        await page.goto("/teams");
        await page.locator('[data-look="indigo"]').focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("[data-look-now]")).toHaveText("Indigo");
    });

    test("nothing moves for people who ask for reduced motion", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/teams");
        const motion = await page
            .locator(".t-phone")
            .first()
            .evaluate((el) => getComputedStyle(el).animationName);
        expect(motion).toBe("none");
    });

    test("pricing separates what's free now from what's planned", async ({ page }) => {
        await page.goto("/pricing");
        await expect(page.locator(".r-table thead th")).toHaveText([
            /Free.*\$0.*Available today/,
            /Pro.*\$6 a month.*Planned/,
            /Team.*\$4 a person.*Planned/,
        ]);
        for (const feature of ["Custom domain", "Shared looks", "Roles and permissions"]) {
            const row = page.locator(".r-table tbody tr", { hasText: feature });
            await expect(row.locator(".r-yes")).toHaveCount(0);
            await expect(row.locator(".st").first()).toHaveText("Coming");
        }
    });

    for (const path of ["/teams", "/pricing"]) {
        test(`${path} has no broken pictures and fits the screen`, async ({ page }) => {
            await page.goto(path);
            const broken = await page.evaluate(async () => {
                const images = [...document.images];
                for (const image of images) image.loading = "eager";
                await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
                return images.filter((image) => !image.naturalWidth).map((image) => image.src);
            });
            expect(broken).toEqual([]);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth,
            );
            expect(overflow).toBeLessThanOrEqual(0);
        });
    }
});
