import { expect, test } from "@playwright/test";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { PORTS } from "../scripts/ports";
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

const COOKIES = ["session_token", "local.session_data"].map((name) => `__Secure-neon-auth.${name}`);

// The editor and the marketing site each proxy /api in development, and share the host's cookies.
async function forwarder(target: number): Promise<{ origin: string; close: () => void }> {
    const server = createServer((req, res) => {
        const out = request(
            { port: target, path: req.url, method: req.method, headers: req.headers },
            (back) => {
                res.writeHead(back.statusCode ?? 502, back.rawHeaders);
                back.pipe(res);
            },
        );
        req.pipe(out);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const { port } = server.address() as AddressInfo;
    return { origin: `http://localhost:${String(port)}`, close: () => server.close() };
}

test("log out clears both cookies and /me on every origin, and back doesn't restore access", async ({
    page,
    context,
    baseURL,
}) => {
    const editor = await forwarder(PORTS.testServer);
    const marketing = await forwarder(PORTS.testServer);
    await signUpToEditor(page);
    const held = async () => (await context.cookies(baseURL)).map((cookie) => cookie.name);
    const me = async (origin: string) =>
        (await context.request.get(`${origin}/api/v1/me`)).status();
    expect(await held()).toEqual(expect.arrayContaining(COOKIES));
    expect(await me(editor.origin)).toBe(200);
    expect(await me(marketing.origin)).toBe(200);

    await page.goto("/app/account");
    await page.locator(".logout:visible").click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(await held()).not.toEqual(expect.arrayContaining([COOKIES[0]]));
    expect(await held()).not.toEqual(expect.arrayContaining([COOKIES[1]]));
    expect(await me(editor.origin)).toBe(401);
    expect(await me(marketing.origin)).toBe(401);

    await page.goBack();
    await page.waitForURL(/\/login/);
    await expect(page.locator("form[data-auth]")).toBeVisible();
    editor.close();
    marketing.close();
});

test("logging out through either proxy ends the session on both", async ({ page, context }) => {
    const editor = await forwarder(PORTS.testServer);
    const marketing = await forwarder(PORTS.testServer);
    await signUpToEditor(page);
    const res = await context.request.post(`${marketing.origin}/api/auth/sign-out`, {
        headers: { origin: marketing.origin, "content-type": "application/json" },
        data: {},
    });
    expect(await res.json()).toEqual({ ended: true });
    expect((await context.request.get(`${editor.origin}/api/v1/me`)).status()).toBe(401);
    expect((await context.request.get(`${marketing.origin}/api/v1/me`)).status()).toBe(401);
    editor.close();
    marketing.close();
});

test("a failed log out says so and keeps the person logged in", async ({ page }) => {
    await signUpToEditor(page);
    await page.goto("/app/account");
    await page.route("**/api/auth/sign-out", (route) => route.abort());
    await page.locator(".logout:visible").click();
    await expect(page.locator(".logout-failed")).toContainText("still logged in");
    expect(new URL(page.url()).pathname).toBe("/app/account");
    expect((await page.request.get("/api/v1/me")).status()).toBe(200);
});

test("logging out in one tab sends the other tab to log in", async ({ page, context }) => {
    await signUpToEditor(page);
    const other = await context.newPage();
    await other.goto("/app/account");
    await expect(other.locator(".logout:visible")).toBeVisible();
    await page.goto("/app/account");
    await page.locator(".logout:visible").click();
    await other.waitForURL(/\/login/);
});

test("a published page opens with no scripts", async ({ page }) => {
    const res = await page.goto("/sample");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText("Maya Okafor");
    expect(await page.locator("script").count()).toBe(0);
});
