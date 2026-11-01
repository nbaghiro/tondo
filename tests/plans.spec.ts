import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { addSection, canvas, openLook, panel, setPlan, signUpToEditor } from "./helpers";

// A page with something of its own on it, so publishing has nothing else to ask about.
const withWords = async (page: Page, options: { plan?: string } = {}) => {
    const handle = await signUpToEditor(page, [], options);
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
                page: { ...draft, header: { ...draft.header, bio: "Hello" } },
                updatedAt,
            }),
        });
    });
    await page.reload();
    await expect(page.locator(".address")).toContainText(handle);
    return handle;
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

test("a Pro look can be tried, and published with free choices", async ({ page }) => {
    const handle = await withWords(page, { plan: "free" });
    await openLook(page);
    const tile = page.locator(".tile[data-look=bake]");
    await expect(tile).toHaveAttribute("aria-label", "Bakehouse look, part of Pro");
    await expect(page.locator(".tile[data-look=sap]")).toHaveAttribute("aria-label", "Sap look");
    await tile.click();
    await expect(page.locator("[data-plan-note]")).toContainText("Bakehouse is part of Pro");

    await page.keyboard.press("Escape");
    await page.locator(".publish").click();
    const planPanel = page.locator("[data-plan-panel]");
    await expect(planPanel).toContainText("Your page uses Bakehouse, which is part of Pro.");
    await planPanel.locator("[data-free-choices]").click();
    await expect(page.locator("[data-free-preview]")).toContainText("Bakehouse becomes Sap.");
    await page.locator("[data-publish-this]").click();
    await expect(page.locator(".pub-address")).toContainText(handle);

    const live = await page.request.get(`/${handle}`);
    expect(await live.text()).toContain('class="look sap"');
    const draft = await page.evaluate(async () => {
        const res = await fetch("/api/v1/me/page");
        return ((await res.json()) as { page: { look: string } }).page.look;
    });
    expect(draft).toBe("bake");

    await page.goto("/app");
    await expect(page.locator(".tag")).toContainText("Live, with free choices");
});

test("a Pro section shows its label and a line about a plain button", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await addSection(page, "shop");
    await expect(page.locator("[data-plan-note]")).toContainText(
        "A plain button can link there for free.",
    );
});

test("Analytics says what Free shows, without asking for more", async ({ page }) => {
    await signUpToEditor(page, [], { plan: "free" });
    await page.goto("/app/analytics");
    await expect(page.locator('.seg button[aria-pressed="true"]')).toContainText("7 days");
    await page.locator(".seg button", { hasText: "90 days" }).click();
    await expect(page.locator("[data-plan-stats]")).toContainText("You can see 7 days on Free.");
    await expect(page.locator('.seg button[aria-pressed="true"]')).toContainText("7 days");
});

test("Pro has no labels", async ({ page }) => {
    await signUpToEditor(page);
    await openLook(page);
    await expect(page.locator(".tile[data-look=bake]")).toHaveAttribute(
        "aria-label",
        "Bakehouse look",
    );
    await expect(page.locator(".pro-label")).toHaveCount(0);
});

test("a tab that hasn't heard about the plan shows the same panel after a refusal", async ({
    page,
}) => {
    await withWords(page);
    await openLook(page);
    await page.locator(".tile[data-look=bake]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".saved.status")).toHaveAttribute("data-state", "saved");
    const handle = (await page.locator(".address b").textContent()) ?? "";
    await setPlan(handle, "free");
    await page.locator(".publish").click();
    await expect(page.locator("[data-plan-panel]")).toContainText("Bakehouse");
});
