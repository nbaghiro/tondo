import { expect } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";
import { TEST_CODE } from "./test-code";

let count = 0;
const unique = () => `t${Date.now().toString(36)}${String(count++)}${String(process.pid)}`;

/** Signs up a new person through the real screens, stopping at the start flow. */
export async function signUpToStart(page: Page, handle = unique()): Promise<string> {
    await page.goto(`/signup?handle=${handle}`);
    await page.locator("input[name=email]").fill(`${handle}@example.com`);
    await page.locator("input[name=password]").fill("long enough pass");
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/verify/);
    await page.locator("input[name=code]").fill(TEST_CODE);
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/app\/start/);
    await expect(page.locator("#start-name")).toBeVisible();
    return handle;
}

/** Walks the start flow with the sections given, and lands in the editor. */
export async function finishStart(page: Page, handle: string, sections: string[] = []) {
    await page.locator("#start-name").fill("Maya Okafor");
    await page.locator("[data-next]").click();
    const defaults = ["about", "links", "photos"];
    for (const key of defaults) {
        if (!sections.includes(key)) await page.locator(`.check[data-id=${key}]`).click();
    }
    for (const key of sections) {
        if (!defaults.includes(key)) await page.locator(`.check[data-id=${key}]`).click();
    }
    await page.locator("[data-next]").click();
    await page.locator("[data-next]").click();
    await page.locator("[data-next]").click();
    await expect(page.locator("#start-handle")).toHaveValue(handle);
    await expect(page.locator("#start-note")).toHaveClass(/ok/);
    await page.locator("[data-next]").click();
    await expect(page.locator(".address")).toContainText(handle);
}

/** Signs up a new person and lands in the editor with an empty page. */
export async function signUpToEditor(page: Page, sections: string[] = []): Promise<string> {
    const handle = await signUpToStart(page);
    await finishStart(page, handle, sections);
    return handle;
}

export const canvas = (page: Page): FrameLocator => page.frameLocator("iframe.canvas");

export const panel = (page: Page) => page.locator(".rside");

const tab = (page: Page, name: string) => page.locator(".tabbar button", { hasText: name });

/** Adds a section from the list, the way someone would on this screen size. */
export async function addSection(page: Page, key: string) {
    const phone = await tab(page, "Add").isVisible();
    if (phone) await tab(page, "Add").click();
    else await page.locator(".add-row").click();
    await page.locator(`[data-add=${key}]`).click();
}

export async function openSections(page: Page) {
    if (await tab(page, "Sections").isVisible()) await tab(page, "Sections").click();
}

export async function openLook(page: Page) {
    if (await tab(page, "Look").isVisible()) await tab(page, "Look").click();
    else await page.locator(".style-entry").click();
}

export async function openPreview(page: Page) {
    if (await tab(page, "Preview").isVisible()) await tab(page, "Preview").click();
    else await page.locator(".preview-open").click();
}
