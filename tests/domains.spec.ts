import { request as httpRequest } from "node:http";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import postgres from "postgres";
import { PORTS } from "../scripts/ports";
import { draftUrl, setPlan, signUpToEditor } from "./helpers";
import { TEST_DATABASE } from "./setup-database";

const CONTROL = `http://127.0.0.1:${String(PORTS.testNeon)}/render-control/dns`;
const SHOTS = process.env["DOMAIN_SHOTS"];

interface Answer {
    allowed: boolean;
    canChange: boolean;
    domain: {
        host: string;
        status: string;
        missing: string | null;
        records: { type: string; name: string; value: string }[];
    } | null;
}

let count = 0;
const domainName = () => `d${Date.now().toString(36)}${String(count++)}${String(process.pid)}.com`;

/** Sends a request with any Host header, as a browser can't. */
const visit = (path: string, host: string, method = "GET") =>
    new Promise<{ status: number; body: string; location: string | undefined }>((done, failed) => {
        const req = httpRequest(
            { host: "127.0.0.1", port: PORTS.testServer, path, method, headers: { host } },
            (res) => {
                let body = "";
                res.on("data", (part: Buffer) => (body += part.toString()));
                res.on("end", () => {
                    done({ status: res.statusCode ?? 0, body, location: res.headers.location });
                });
            },
        );
        req.on("error", failed);
        req.end();
    });

const setDns = async (host: string, what: Record<string, string>) => {
    await fetch(`${CONTROL}?${new URLSearchParams({ host, ...what }).toString()}`);
};

const domainUrl = async (page: Page) => `${await draftUrl(page)}/domain`;

const askFor = async (page: Page, host: string) => {
    const res = await page.request.post(await domainUrl(page), { data: { domain: host } });
    return { status: res.status(), body: (await res.json()) as Answer & { error?: string } };
};

const check = async (page: Page) => {
    const res = await page.request.post(`${await domainUrl(page)}/check`, { data: {} });
    return { status: res.status(), body: (await res.json()) as Answer & { error?: string } };
};

async function publish(page: Page) {
    const url = await draftUrl(page);
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
    const res = await page.request.post(`${url}/publish`, { data: { updatedAt } });
    expect(res.status()).toBe(204);
}

async function connect(page: Page, host: string) {
    const asked = await askFor(page, host);
    expect(asked.status).toBe(201);
    const code = asked.body.domain?.records.find((record) => record.type === "TXT")?.value ?? "";
    await setDns(host, { txt: code, points: "1" });
    return check(page);
}

test.describe("custom domains", () => {
    test("connecting one in settings, in plain steps, and removing it", async ({ page }, info) => {
        const handle = await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        await page.goto("/app/settings");
        const field = page.locator("input[name=domain]");
        await expect(field).toBeVisible();
        if (SHOTS) {
            await page.screenshot({
                path: `${SHOTS}/empty-${info.project.name}.png`,
                fullPage: true,
            });
        }
        await field.fill(`https://www.${host}/`);
        await page.getByRole("button", { name: "Connect domain" }).click();

        const waiting = page.locator("[data-domain-waiting]");
        await expect(waiting).toContainText("Log in to the company you bought");
        await expect(waiting.locator(".dns")).toContainText("216.24.57.1");
        await expect(waiting.locator(".dns")).toContainText("tondo-stand-in.onrender.com");
        await expect(waiting.locator(".dns")).toContainText("_tondo");

        await page.locator("[data-domain-check]").click();
        await expect(page.locator("[data-domain-missing]")).toContainText("TXT record");
        // Nothing shows there yet, because nothing has been proved.
        expect((await visit("/", host)).status).toBe(404);
        if (SHOTS) {
            await page.screenshot({
                path: `${SHOTS}/waiting-${info.project.name}.png`,
                fullPage: true,
            });
        }

        const answer = (await (await page.request.get(await domainUrl(page))).json()) as Answer;
        const code = answer.domain?.records.find((record) => record.type === "TXT")?.value ?? "";
        await setDns(host, { txt: code });
        await page.locator("[data-domain-check]").click();
        await expect(page.locator("[data-domain-missing]")).toContainText("waiting for the others");
        expect((await visit("/", host)).status).toBe(404);

        await setDns(host, { points: "1" });
        await page.locator("[data-domain-check]").click();
        await expect(page.locator("[data-domain-live]")).toContainText("Your page shows");
        if (SHOTS) {
            await page.screenshot({
                path: `${SHOTS}/live-${info.project.name}.png`,
                fullPage: true,
            });
        }

        const served = await visit("/", host);
        expect(served.status).toBe(200);
        expect(served.body).toContain("Maya Okafor");
        expect(served.body).toContain(`<link rel="canonical" href="https://${host}/">`);
        expect(served.body).toContain(`content="https://${host}/"`);
        // The old address keeps working, and says where the page belongs.
        const old = await page.request.get(`/${handle}`);
        expect(old.status()).toBe(200);
        expect(await old.text()).toContain(`<link rel="canonical" href="https://${host}/">`);
        const sitemap = await visit("/sitemap.xml", host);
        expect(sitemap.body).toContain(`<loc>https://${host}/</loc>`);

        await page.locator("[data-domain-remove]").click();
        await page.locator("[data-domain-remove-yes]").click();
        await expect(page.locator("input[name=domain]")).toBeVisible();
        expect((await visit("/", host)).status).toBe(404);
        expect((await page.request.get(`/${handle}`)).status()).toBe(200);
        const stored = await fetch(`${CONTROL}?host=${host}`);
        expect(((await stored.json()) as { added: boolean }).added).toBe(false);
    });

    test("a host header can't reach the app, API or someone else's page", async ({ page }) => {
        const handle = await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        expect((await connect(page, host)).body.domain?.status).toBe("live");
        expect((await visit("/", host)).status).toBe(200);
        for (const path of [
            "/app",
            "/app/settings",
            "/login",
            "/pricing",
            "/api/v1/me",
            "/api/v1/me/pages",
            "/sample",
            `/${handle}`,
        ]) {
            const res = await visit(path, host);
            expect(res.status, path).toBe(404);
            expect(res.body, path).toContain("no page here");
        }
        expect((await visit("/api/v1/me/pages", host, "POST")).status).toBe(404);
        for (const stranger of ["evil.example.net", "127.0.0.2", "tondo.page.evil.net"]) {
            for (const path of ["/", "/sample", `/${handle}`, "/app", "/api/v1/me"]) {
                expect((await visit(path, stranger)).status, `${stranger}${path}`).toBe(404);
            }
        }
        expect((await visit(`/l/sample/abc`, host)).status).toBe(404);
        // Tondo's own address still has everything.
        expect((await visit("/sample", "localhost")).status).toBe(200);
    });

    test("refuses tondo.page itself and a domain already in use, once per page", async ({
        browser,
        page,
    }) => {
        await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        for (const bad of [
            "tondo.page",
            "www.tondo.page",
            "maya.tondo.page",
            "nonsense",
            "1.2.3.4",
        ]) {
            expect((await askFor(page, bad)).status, bad).toBe(400);
        }
        expect((await connect(page, host)).body.domain?.status).toBe("live");
        expect((await askFor(page, domainName())).status).toBe(409);

        const second = await (await browser.newContext()).newPage();
        await signUpToEditor(second);
        const refused = await askFor(second, host);
        expect(refused.status).toBe(409);
        expect(refused.body.error).toContain("already connected");
        await second.context().close();
    });

    test("asking first doesn't hold a domain, and proving it does", async ({ browser, page }) => {
        await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        // Someone with no right to the domain asks for it first.
        const squatter = await (await browser.newContext()).newPage();
        await signUpToEditor(squatter);
        expect((await askFor(squatter, host)).status).toBe(201);
        // The owner can still connect it, and the squatter's code proves nothing.
        expect((await connect(page, host)).body.domain?.status).toBe("live");
        const failed = await check(squatter);
        expect(failed.body.domain?.status).toBe("waiting");
        expect(failed.body.domain?.missing).toBe("code");
        expect((await visit("/", host)).body).toContain("Maya Okafor");
        await squatter.context().close();
    });

    test("a new owner's proof takes a domain from an old holder", async ({ browser, page }) => {
        await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        expect((await connect(page, host)).body.domain?.status).toBe("live");
        await setDns(host, { cleartxt: "1" });
        const buyer = await (await browser.newContext()).newPage();
        await signUpToEditor(buyer);
        await publish(buyer);
        expect((await connect(buyer, host)).body.domain?.status).toBe("live");
        const before = (await (await page.request.get(await domainUrl(page))).json()) as Answer;
        expect(before.domain?.status).toBe("waiting");
        await buyer.context().close();
    });

    test("needs Pro, and pauses when the plan ends", async ({ page }) => {
        // Each change waits out the 15 second page cache, as the plan is changed directly here.
        test.setTimeout(90_000);
        const handle = await signUpToEditor(page);
        await publish(page);
        const host = domainName();
        expect((await connect(page, host)).body.domain?.status).toBe("live");

        await setPlan(handle, "starter");
        await expect
            .poll(async () => (await visit("/", host)).status, { timeout: 20_000 })
            .toBe(404);
        // The tondo.page address carries on, on a plan with a live page.
        expect((await visit(`/${handle}`, "localhost")).status).toBe(200);
        await page.goto("/app/settings");
        await expect(page.locator("[data-domain-paused]")).toBeVisible();

        await setPlan(handle, "pro", new Date(Date.now() - 1000));
        await expect
            .poll(async () => (await visit(`/${handle}`, "localhost")).status, { timeout: 20_000 })
            .toBe(404);
        expect((await visit("/", host)).status).toBe(404);

        await setPlan(handle, "pro");
        await expect
            .poll(async () => (await visit("/", host)).status, { timeout: 20_000 })
            .toBe(200);
    });

    test("Starter sees where to get it, and can't connect one", async ({ page }, info) => {
        await signUpToEditor(page, [], { plan: "starter" });
        await page.goto("/app/settings");
        await expect(page.locator("[data-domain-pro]")).toContainText("comes with Pro");
        await expect(page.locator("input[name=domain]")).toHaveCount(0);
        if (SHOTS) {
            await page.screenshot({
                path: `${SHOTS}/starter-${info.project.name}.png`,
                fullPage: true,
            });
        }
        const refused = await askFor(page, domainName());
        expect(refused.status).toBe(403);
    });

    test("an unpublished page shows nothing at its domain", async ({ page }) => {
        await signUpToEditor(page);
        const host = domainName();
        expect((await connect(page, host)).body.domain?.status).toBe("live");
        expect((await visit("/", host)).status).toBe(404);
        await page.goto("/app/settings");
        await expect(page.locator("[data-domain-live]")).toContainText("once you publish");
    });

    test("deleting a page frees its domain", async ({ browser, page }) => {
        await signUpToEditor(page);
        const created = await page.request.post("/api/v1/me/pages", {
            data: { name: "Second", handle: `s${Date.now().toString(36)}${String(process.pid)}` },
        });
        const { id } = (await created.json()) as { id: string };
        const host = domainName();
        const asked = await page.request.post(`/api/v1/me/pages/${id}/domain`, {
            data: { domain: host },
        });
        const code = ((await asked.json()) as Answer).domain?.records.at(-1)?.value ?? "";
        await setDns(host, { txt: code, points: "1" });
        await page.request.post(`/api/v1/me/pages/${id}/domain/check`, { data: {} });
        const gone = await page.request.delete(`/api/v1/me/pages/${id}`, { data: {} });
        expect(gone.status()).toBe(204);
        const sql = postgres(TEST_DATABASE, { max: 1 });
        const rows = await sql`select 1 from domains where host = ${host}`;
        await sql.end();
        expect(rows.length).toBe(0);
        const other = await (await browser.newContext()).newPage();
        await signUpToEditor(other);
        expect((await askFor(other, host)).status).toBe(201);
        await other.context().close();
    });
});
