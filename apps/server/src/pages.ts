import { publishRequest, routes, saveRequest } from "@tondo/contract";
import type {
    DraftResponse,
    ErrorResponse,
    IssuesResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import type { PageStore } from "@tondo/db";
import { publishIssues } from "@tondo/page";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import { planIssues } from "./limits";

const MAX_PAGE_BYTES = 1024 * 1024;
const STATS_DAYS = 30;

// Every route here acts on the signed-in person's own page. No request names a page or a user, so
// there's no way to ask for someone else's.
export function mountPages(app: Hono, store: PageStore, currentPerson: CurrentPerson): void {
    const fail = (c: Context, status: 400 | 401 | 404 | 409 | 413 | 415, error: string) =>
        c.json<ErrorResponse>({ error }, status);
    const conflict = (c: Context) =>
        fail(c, 409, "This page was changed somewhere else. Reload to get the latest version.");

    const jsonBody = bodyLimit({
        maxSize: MAX_PAGE_BYTES,
        onError: (c) => fail(c, 413, "This page is too large to save."),
    });
    // A form on another site can't send JSON without permission, which blocks cross-site posts.
    const isJson = (c: Context) => c.req.header("content-type")?.startsWith("application/json");

    app.get(routes.draft, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const draft = await store.findDraft(person.id);
        if (!draft) return fail(c, 404, "Choose your address first.");
        return c.json<DraftResponse>(draft);
    });

    app.put(routes.draft, jsonBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = saveRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "This page has something that can't be saved.");
        const updatedAt = await store.saveDraft(person.id, parsed.data.page, parsed.data.updatedAt);
        return updatedAt ? c.json<SaveResponse>({ updatedAt }) : conflict(c);
    });

    app.post(routes.publish, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const parsed = publishRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "Save your page and try again.");
        const draft = await store.findDraft(person.id);
        if (!draft) return fail(c, 404, "Choose your address first.");
        const issues = [
            ...publishIssues(draft.page),
            ...planIssues(draft.page).map((message) => ({ target: "page", message })),
        ];
        if (issues.length) {
            return c.json<IssuesResponse>({ error: "Fix these before publishing.", issues }, 422);
        }
        return (await store.publish(person.id, parsed.data.updatedAt))
            ? c.body(null, 204)
            : conflict(c);
    });

    app.get(routes.stats, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        return c.json<StatsResponse>(await store.statsFor(person.id, STATS_DAYS));
    });
}
