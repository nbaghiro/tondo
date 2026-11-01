import { expect, test } from "@playwright/test";
import { signUpToEditor } from "./helpers";

test("sign-up verifies the email, then reaches the editor at the chosen address", async ({
    page,
}) => {
    await signUpToEditor(page);
});

test("a wrong code is refused, with a clear message", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("input[name=email]").fill(`wrong${String(Date.now())}@example.com`);
    await page.locator("input[name=password]").fill("long enough pass");
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/verify/);
    await page.locator("input[name=code]").fill("000000");
    await page.locator(".auth-submit").click();
    await expect(page.locator("[data-error]")).toContainText("isn't right");
});

test("the editor sends logged-out people to log in", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/login/);
});

test("log out ends the session", async ({ page }) => {
    await signUpToEditor(page);
    const tab = page.locator(".tabbar button", { hasText: "Sections" });
    if (await tab.isVisible()) await tab.click();
    await page.goto("/app/account");
    await page.locator(".logout:visible").click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/app");
    await page.waitForURL(/\/login/);
});

test("a published page opens with no scripts", async ({ page }) => {
    const res = await page.goto("/sample");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Maya Okafor");
    expect(await page.locator("script").count()).toBe(0);
});
