import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe("the gallery", () => {
    test("shows every example page, drawn by the real renderer", async ({ page }) => {
        await page.goto("/gallery");
        await expect(page.locator(".exgrid .ex")).toHaveCount(75);
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
        await expect(page.locator("h1")).toHaveText("Free to build, and paying puts it online");
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

    test("the header stays put between pages, and marks the current one", async ({ page }) => {
        const place = async (path: string) => {
            await page.goto(path);
            return page.locator("nav").first().boundingBox();
        };
        const home = await place("/");
        for (const path of ["/teams", "/pricing", "/gallery", "/privacy"]) {
            expect(await place(path)).toEqual(home);
        }
        await page.goto("/teams");
        await expect(page.locator('nav a[aria-current="page"]')).toHaveText("Teams");
    });

    test("teams reads as a finished product, and leads to sign-up and pricing", async ({
        page,
    }) => {
        await page.goto("/teams");
        await expect(page.locator("main, body").first()).not.toContainText(
            /coming|planned|sketch/i,
        );
        await expect(page.locator(".t-hero .mbtn")).toHaveAttribute("href", "/signup");
        await expect(page.locator(".t-hero .pl-link")).toHaveAttribute("href", "/pricing");
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

    test("pricing states the plans, with cards that go to sign-up", async ({ page }) => {
        await page.goto("/pricing");
        await expect(page.locator(".r-table thead th")).toHaveText([
            /Free.*\$0/,
            /Starter.*\$4 a month or \$40 a year/,
            /Pro.*\$10 a month or \$100 a year/,
        ]);
        const live = page.locator(".r-table tbody tr", { hasText: "Live pages" });
        await expect(live.locator(".r-value")).toHaveText(["None", "1", "5"]);
        await expect(page.locator(".pc-card")).toHaveCount(3);
        await expect(page.locator(".pc-card a")).toHaveCount(3);
        for (const link of await page.locator(".pc-card a").all()) {
            await expect(link).toHaveAttribute("href", "/signup");
        }
        const body = page.locator("body");
        for (const words of [
            "Made with Tondo",
            "a person",
            "Planned",
            "Available today",
            "Coming",
            "can't be bought",
        ]) {
            await expect(body).not.toContainText(words);
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

test.describe("the filmstrip", () => {
    const position = (page: Page) =>
        page
            .locator(".ex-track")
            .evaluate((track) => new DOMMatrix(getComputedStyle(track).transform).m41);
    const loopWidth = (page: Page) =>
        page.locator(".ex-track").evaluate((track) => {
            const copy = track.children[track.children.length / 2];
            return copy instanceof HTMLElement ? copy.offsetLeft : 0;
        });
    // How far it has gone forward, allowing for it wrapping around its loop on the way.
    const travelled = async (page: Page, from: number) => {
        const width = await loopWidth(page);
        return (((from - (await position(page))) % width) + width) % width;
    };
    const strip = async (page: Page) => {
        await page.goto("/");
        const row = page.locator("[data-strip]");
        await row.scrollIntoViewIfNeeded();
        const box = await row.boundingBox();
        if (!box) throw new Error("The strip isn't on the page.");
        return { row, middle: { x: box.x + box.width / 2, y: box.y + box.height / 2 } };
    };

    test("has no play, pause or step buttons", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("#pages button:not(dialog button)")).toHaveCount(0);
    });

    test.describe("with a mouse", () => {
        test.skip(({ isMobile }) => isMobile, "Needs a mouse.");

        test("a drag moves the strip without opening a page, and a click still does", async ({
            page,
        }) => {
            const { middle } = await strip(page);
            await page.mouse.move(middle.x, middle.y);
            await page.mouse.down();
            await page.mouse.move(middle.x - 60, middle.y, { steps: 3 });
            const start = await position(page);
            await page.mouse.move(middle.x - 260, middle.y, { steps: 5 });
            expect(await travelled(page, start)).toBeGreaterThan(190);
            await page.waitForTimeout(150);
            await page.mouse.up();
            await expect(page.locator("dialog.pv")).not.toBeVisible();
            await expect(page).toHaveURL(/\/$/);
            await page.mouse.click(middle.x, middle.y);
            await expect(page.locator("dialog.pv")).toBeVisible();
        });

        test("sideways wheel moves it both ways and it stays in its loop", async ({ page }) => {
            const { middle } = await strip(page);
            await page.mouse.move(middle.x, middle.y);
            const width = await loopWidth(page);
            const before = await position(page);
            await page.mouse.wheel(300, 0);
            await expect.poll(() => travelled(page, before)).toBeGreaterThan(250);
            for (const delta of [width + 500, -(2 * width + 900)]) {
                await page.mouse.wheel(delta, 0);
                await page.waitForTimeout(100);
                const at = await position(page);
                expect(at).toBeLessThanOrEqual(0);
                expect(at).toBeGreaterThan(-width);
            }
        });

        test("auto-scroll eases back after a person stops", async ({ page }) => {
            const { middle } = await strip(page);
            await page.mouse.move(middle.x, middle.y);
            await page.mouse.wheel(200, 0);
            await page.mouse.move(5, 5);
            await page.waitForTimeout(100);
            const stopped = await position(page);
            await page.waitForTimeout(400);
            expect(Math.abs((await position(page)) - stopped)).toBeLessThan(2);
            await expect.poll(() => travelled(page, stopped), { timeout: 5000 }).toBeGreaterThan(5);
        });

        test("reduced motion stays still and can still be dragged", async ({ page }) => {
            await page.emulateMedia({ reducedMotion: "reduce" });
            const { middle } = await strip(page);
            const start = await position(page);
            await page.waitForTimeout(500);
            expect(await position(page)).toBe(start);
            await page.mouse.move(middle.x, middle.y);
            await page.mouse.down();
            await page.mouse.move(middle.x - 200, middle.y, { steps: 5 });
            await page.mouse.up();
            const moved = await position(page);
            expect(await travelled(page, start)).toBeGreaterThan(150);
            await page.waitForTimeout(1600);
            expect(await position(page)).toBe(moved);
        });

        test("keyboard focus reaches the cards and brings them into view", async ({ page }) => {
            const { row } = await strip(page);
            const card = row.locator("a.ex:not([aria-hidden])").nth(4);
            await card.focus();
            await page.keyboard.press("Tab");
            await expect(row.locator("a.ex:not([aria-hidden])").nth(5)).toBeFocused();
            await expect(row.locator("a.ex:not([aria-hidden])").nth(5)).toBeInViewport();
        });
    });

    test.describe("with touch", () => {
        test.skip(({ isMobile }) => !isMobile, "Needs touch.");

        const swipe = async (
            page: Page,
            from: { x: number; y: number },
            by: { x: number; y: number },
        ) => {
            const cdp = await page.context().newCDPSession(page);
            const send = (
                type: "touchStart" | "touchMove" | "touchEnd",
                points: { x: number; y: number }[],
            ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
            await send("touchStart", [from]);
            for (let i = 1; i <= 8; i++) {
                await send("touchMove", [
                    { x: from.x + (by.x * i) / 8, y: from.y + (by.y * i) / 8 },
                ]);
                await page.waitForTimeout(16);
            }
            await send("touchEnd", []);
        };

        test("a sideways swipe moves the strip without opening a page", async ({ page }) => {
            const { middle } = await strip(page);
            const before = await position(page);
            await swipe(page, middle, { x: -160, y: 0 });
            expect(await travelled(page, before)).toBeGreaterThan(90);
            await expect(page.locator("dialog.pv")).not.toBeVisible();
        });

        test("a tap opens the page", async ({ page }) => {
            const { middle } = await strip(page);
            await page.touchscreen.tap(middle.x, middle.y);
            await expect(page.locator("dialog.pv")).toBeVisible();
        });

        test("an upward swipe over the strip scrolls the page", async ({ page }) => {
            const { middle } = await strip(page);
            const before = await page.evaluate(() => scrollY);
            await swipe(page, middle, { x: 0, y: -200 });
            await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 80);
        });
    });
});
