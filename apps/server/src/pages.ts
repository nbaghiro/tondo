import { publishRequest, routes, saveRequest } from "@tondo/contract";
import type {
    DraftResponse,
    LiveResponse,
    ErrorResponse,
    IssuesResponse,
    PublishCheckResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import type { Draft, PageStore } from "@tondo/db";
import { pageHash, publishIssues } from "@tondo/page";
import type { PublishIssue } from "@tondo/page";
import { linkTargets } from "@tondo/render";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import { blockedIssues } from "./blocked";
import type { LimitsOfPerson } from "./limits";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

const MAX_PAGE_BYTES = 1024 * 1024;
const STATS_DAYS = 30;
const STAT_RANGES = [7, 30, 90];
const SUSPENDED =
    "This page was taken down for breaking our rules, so it can't go live. Contact support if you think that's a mistake.";

// Every route here acts on the signed-in person's own page. No request names a page or a user, so
// there's no way to ask for someone else's.
export function mountPages(
    app: Hono,
    store: PageStore,
    currentPerson: CurrentPerson,
    options: {
        scale: Scale;
        limitsOfPerson: LimitsOfPerson;
        onPublishChange: (userId: string) => Promise<void>;
    },
): void {
    const { scale, limitsOfPerson, onPublishChange } = options;
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
    const allowUnpublish = createLimiter(scale(20), 60_000);
    const allowStats = createLimiter(scale(120), 60_000);
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
        const current = previous?.length ? await store.findDraft(person.id) : null;
        if (current && previous?.includes(pageHash(current.page))) {
            const again = await store.saveDraft(person.id, page, current.updatedAt);
            if (again) return c.json<SaveResponse>({ updatedAt: again });
        }
        return conflict(c);
    });

    // What only the server can know. The editor adds these to its own list before anyone presses Publish.
    const serverIssues = (draft: Draft): PublishIssue[] => [
        ...(draft.suspended ? [{ target: "page", message: SUSPENDED }] : []),
        ...blockedIssues(draft.page),
    ];

    app.get(routes.publishCheck, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const draft = await store.findDraft(person.id);
        if (!draft) return fail(c, 404, "Choose your address first.");
        return c.json<PublishCheckResponse>({ issues: serverIssues(draft) });
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
        const issues = [...serverIssues(draft), ...publishIssues(draft.page)];
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
        if (!allowUnpublish(person.id)) return slowDown(c);
        await store.unpublish(person.id);
        await onPublishChange(person.id);
        return c.body(null, 204);
    });

    app.get(routes.live, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const page = await store.findOwnLive(person.id);
        if (!page) return fail(c, 404, "Your page isn't live.");
        return c.json<LiveResponse>({ page });
    });

    app.get(routes.stats, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowStats(person.id)) return slowDown(c);
        const asked = Number(c.req.query("days") ?? STATS_DAYS);
        const { statsDays } = await limitsOfPerson(person.id);
        const days = Math.min(STAT_RANGES.includes(asked) ? asked : STATS_DAYS, statsDays);
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
            earlierClicks: stats.targets
                .filter(({ target }) => !urls[target])
                .reduce((sum, { clicks }) => sum + clicks, 0),
            range: days,
        });
    });
}
