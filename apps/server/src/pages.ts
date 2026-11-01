import { publishRequest, routes, saveRequest } from "@tondo/contract";
import type {
    DraftResponse,
    ErrorResponse,
    IssuesResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import type { PageStore } from "@tondo/db";
import { pageHash, publishIssues } from "@tondo/page";
import { linkTargets } from "@tondo/render";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import { blockedLinks, planIssues } from "./limits";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

const MAX_PAGE_BYTES = 1024 * 1024;
const STATS_DAYS = 30;
const STAT_RANGES = [7, 30, 90];

// Every route here acts on the signed-in person's own page. No request names a page or a user, so
// there's no way to ask for someone else's.
export function mountPages(
    app: Hono,
    store: PageStore,
    currentPerson: CurrentPerson,
    options: { scale: Scale; onPublishChange: (userId: string) => Promise<void> },
): void {
    const { scale, onPublishChange } = options;
    const fail = (c: Context, status: 400 | 401 | 404 | 409 | 413 | 415 | 429, error: string) =>
        c.json<ErrorResponse>({ error }, status);
    const conflict = (c: Context) =>
        fail(c, 409, "This page was changed somewhere else. Reload to get the latest version.");

    const jsonBody = bodyLimit({
        maxSize: MAX_PAGE_BYTES,
        onError: (c) => fail(c, 413, "This page is too large to save."),
    });
    const smallBody = bodyLimit({
        maxSize: 4096,
        onError: (c) => fail(c, 413, "That's too long."),
    });
    // A form on another site can't send JSON without permission, which blocks cross-site posts.
    const isJson = (c: Context) => c.req.header("content-type")?.startsWith("application/json");
    const allowSave = createLimiter(scale(240), 60_000);
    const allowPublish = createLimiter(scale(30), 60_000);
    const slowDown = (c: Context) => fail(c, 429, "Too many tries. Wait a little and try again.");

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
        if (!allowSave(person.id)) return slowDown(c);
        const parsed = saveRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "This page has something that can't be saved.");
        const { page, updatedAt, previous } = parsed.data;
        const saved = await store.saveDraft(person.id, page, updatedAt);
        if (saved) return c.json<SaveResponse>({ updatedAt: saved });
        // The answer to the last save may have been lost on the way back. If what's stored is exactly
        // what this browser last sent, then it's this browser's own work and not someone else's.
        const current = previous ? await store.findDraft(person.id) : null;
        if (current && pageHash(current.page) === previous) {
            const again = await store.saveDraft(person.id, page, current.updatedAt);
            if (again) return c.json<SaveResponse>({ updatedAt: again });
        }
        return conflict(c);
    });

    app.post(routes.publish, smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowPublish(person.id)) return slowDown(c);
        const parsed = publishRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "Save your page and try again.");
        const draft = await store.findDraft(person.id);
        if (!draft) return fail(c, 404, "Choose your address first.");
        const issues = [
            ...publishIssues(draft.page),
            ...planIssues(draft.page).map((message) => ({ target: "page", message })),
            ...blockedLinks(draft.page).map((url) => ({
                target: "page",
                message: `This link can't be used on Tondo: ${url}`,
            })),
        ];
        if (issues.length) {
            return c.json<IssuesResponse>({ error: "Fix these before publishing.", issues }, 422);
        }
        if (!(await store.publish(person.id, parsed.data.updatedAt))) return conflict(c);
        await onPublishChange(person.id);
        return c.body(null, 204);
    });

    app.post(routes.unpublish, smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        await store.unpublish(person.id);
        await onPublishChange(person.id);
        return c.body(null, 204);
    });

    app.get(routes.stats, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const asked = Number(c.req.query("days") ?? STATS_DAYS);
        const days = STAT_RANGES.includes(asked) ? asked : STATS_DAYS;
        const stats = await store.statsFor(person.id, days);
        const live = await store.findOwnLive(person.id);
        const urls = live ? linkTargets(live) : {};
        return c.json<StatsResponse>({
            views: stats.views,
            clicks: stats.clicks,
            days: stats.days,
            links: stats.targets.flatMap(({ target, clicks }) => {
                const url = urls[target];
                return url ? [{ url, clicks }] : [];
            }),
        });
    });
}
