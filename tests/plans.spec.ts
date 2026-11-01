import { expect, test } from "@playwright/test";
import { canvas, panel, signUpToEditor } from "./helpers";

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

test("Free asks for 7 days of statistics at most", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    const answer = await page.evaluate(async () => {
        const res = await fetch("/api/v1/me/stats?days=90");
        return (await res.json()) as { range: number; days: unknown[] };
    });
    expect(answer.range).toBe(7);
    expect(answer.days).toHaveLength(7);
});

test("the server refuses a Pro look on Free, and can publish free choices instead", async ({
    page,
}) => {
    const handle = await signUpToEditor(page, [], { plan: "free" });
    await page.evaluate(async () => {
        const res = await fetch("/api/v1/me/page");
        const { page: draft, updatedAt } = (await res.json()) as {
            page: Record<string, unknown> & { header: Record<string, unknown> };
            updatedAt: string;
        };
        await fetch("/api/v1/me/page", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                page: { ...draft, look: "bake", header: { ...draft.header, bio: "Hello" } },
                updatedAt,
            }),
        });
    });
    const publish = (free: boolean) =>
        page.evaluate(async (asFree) => {
            const { updatedAt } = (await (await fetch("/api/v1/me/page")).json()) as {
                updatedAt: string;
            };
            const res = await fetch("/api/v1/me/page/publish", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ updatedAt, ...(asFree ? { free: true } : {}) }),
            });
            return res.status;
        }, free);
    expect(await publish(false)).toBe(422);
    expect(await publish(true)).toBe(204);
    const live = await page.request.get(`/${handle}`);
    expect(await live.text()).toContain('class="look sap"');
    const draft = await page.evaluate(async () => {
        const res = await fetch("/api/v1/me/page");
        return ((await res.json()) as { page: { look: string } }).page.look;
    });
    expect(draft).toBe("bake");
});
