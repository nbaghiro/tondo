import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { canvas, openSections, signUpToEditor } from "./helpers";

const url = "/api/v1/me/page";

/** Publishes a page with one button, then changes the draft to something else. */
async function liveWithChanges(page: Page) {
    await page.evaluate(async (draftUrl) => {
        const put = async (text: string, updatedAt: string) => {
            const res = await fetch(draftUrl, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    updatedAt,
                    page: {
                        ...draft.page,
                        blocks: [
                            {
                                id: "b1",
                                section: "b1",
                                type: "button",
                                variant: "filled",
                                text,
                                url: "https://fine.example.com/",
                            },
                        ],
                    },
                }),
            });
            return ((await res.json()) as { updatedAt: string }).updatedAt;
        };
        const draft = (await (await fetch(draftUrl)).json()) as {
            page: object;
            updatedAt: string;
        };
        const updatedAt = await put("The live words", draft.updatedAt);
        await fetch(`${draftUrl}/publish`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ updatedAt }),
        });
        await put("Words not live yet", updatedAt);
    }, url);
}

test("the builder goes back to what's live, and Undo brings the changes back", async ({ page }) => {
    await signUpToEditor(page);
    await expect(page.locator(".status")).toHaveText("Saved");
    await liveWithChanges(page);
    await page.goto("/app/edit");
    const button = canvas(page).locator("a.b-btn");
    await expect(button).toContainText("Words not live yet");

    await openSections(page);
    await page.locator(".discard-open").click();
    await page.locator(".discard").click();
    await page.locator(".discard-yes").click();
    await expect(button).toContainText("The live words");
    await expect(page.locator(".status")).toHaveText("Saved");
    await expect(page.locator(".publish")).toHaveText("Published");

    await page.locator('[aria-label="Undo"]').click();
    await expect(button).toContainText("Words not live yet");
    await expect(page.locator(".publish")).toHaveText("Publish");
});

test("a page that was never published offers no way to discard", async ({ page }) => {
    await signUpToEditor(page);
    await openSections(page);
    await expect(page.locator(".discard-open")).toHaveCount(0);
    await page.goto("/app");
    await expect(page.locator(".discard")).toHaveCount(0);
});

test("Home goes back to what's live, and refuses if the page changed elsewhere", async ({
    page,
}) => {
    await signUpToEditor(page);
    await expect(page.locator(".status")).toHaveText("Saved");
    await liveWithChanges(page);
    await page.goto("/app");
    await page.locator(".discard").click();

    // Another tab saves while this one is asking.
    await page.evaluate(async (draftUrl) => {
        const draft = (await (await fetch(draftUrl)).json()) as {
            page: object;
            updatedAt: string;
        };
        await fetch(draftUrl, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ page: draft.page, updatedAt: draft.updatedAt }),
        });
    }, url);
    await page.locator(".discard-yes").click();
    await expect(page.locator(".toast-s")).toContainText("changed somewhere else");

    await page.locator(".discard").click();
    await page.locator(".discard-yes").click();
    await expect(page.locator(".toast-s")).toContainText("Back to your live page");
    await expect(page.locator(".tag")).toHaveText("Live");
});
