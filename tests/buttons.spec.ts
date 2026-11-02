import { expect, test } from "@playwright/test";
import { canvas, openLook, panel, signUpToEditor } from "./helpers";

const background = (locator: ReturnType<ReturnType<typeof canvas>["locator"]>) =>
    locator.evaluate((node) => getComputedStyle(node).backgroundColor);

test("buttons change style from Look, and Lead keeps only the first solid", async ({ page }) => {
    await signUpToEditor(page, ["links"]);
    const buttons = canvas(page).locator("a.b-btn");
    await expect(buttons).toHaveCount(2);
    await openLook(page);
    await page.getByRole("tab", { name: "Make it yours" }).click();
    await page.locator("[data-mine=btn]").click();

    await page.locator(".sh[data-fill=lead]").click();
    await expect.poll(() => background(buttons.nth(1))).toBe("rgba(0, 0, 0, 0)");
    expect(await background(buttons.first())).not.toBe("rgba(0, 0, 0, 0)");

    await page.locator(".sh[data-fill=rows]").click();
    await expect.poll(() => background(buttons.first())).toBe("rgba(0, 0, 0, 0)");
    await expect(panel(page).locator("[data-mine=btn]")).toContainText("Rows");
});
