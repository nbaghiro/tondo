import { expect } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";
import { TEST_CODE } from "./test-code";

let count = 0;
const unique = () => `t${Date.now().toString(36)}${String(count++)}${String(process.pid)}`;

/** Signs up a new person through the real screens, and lands in the editor. */
export async function signUpToEditor(page: Page): Promise<string> {
    const handle = unique();
    await page.goto(`/signup?handle=${handle}`);
    await page.locator("input[name=email]").fill(`${handle}@example.com`);
    await page.locator("input[name=password]").fill("long enough pass");
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/verify/);
    await page.locator("input[name=code]").fill(TEST_CODE);
    await page.locator(".auth-submit").click();
    await page.waitForURL(/\/app/);
    await expect(page.locator(".address")).toContainText(handle);
    return handle;
}

export const canvas = (page: Page): FrameLocator => page.frameLocator("iframe.canvas");
