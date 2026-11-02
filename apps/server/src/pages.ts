import {
    changeHandleRequest,
    newPageRequest,
    publishRequest,
    routes,
    saveRequest,
} from "@tondo/contract";
import type {
    DraftResponse,
    HandleChangedResponse,
    LiveResponse,
    ErrorResponse,
    IssuesResponse,
    NewPageResponse,
    PagesResponse,
    PublishCheckResponse,
    SaveResponse,
    StatsResponse,
} from "@tondo/contract";
import type { Draft, PageStore } from "@tondo/db";
import {
    canAddPage,
    canPublishStanding,
    isCovered,
    isPageOnline,
    pageHash,
    publishIssues,
    sameTeamLook,
    starterPage,
} from "@tondo/page";
import type { Page, PublishIssue } from "@tondo/page";
import { linkTargets } from "@tondo/render";
import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { CurrentPerson } from "./auth";
import { blockedIssues } from "./blocked";
import { limitsOf, livePageIssue } from "./limits";
import type { LimitsOfPerson } from "./limits";
import { summaryOut } from "./summaries";
import { createLimiter } from "./traffic";
import type { Scale } from "./traffic";

const MAX_PAGE_BYTES = 1024 * 1024;
const STATS_DAYS = 30;
const STAT_RANGES = [7, 30, 90];
const SUSPENDED =
    "This page was taken down for breaking our rules, so it can't go live. Contact support if you think that's a mistake.";

// Every route here names a page by id, and the store only finds it if the signed-in person can edit it,
// so a page they can't reach answers the same as one that doesn't exist.
export function mountPages(
    app: Hono,
    store: PageStore,
    currentPerson: CurrentPerson,
    options: {
        scale: Scale;
        limitsOfPerson: LimitsOfPerson;
        onHandleChange: (before: string | null, after: string | null) => void;
        /** Which of someone's pages visitors see can depend on any of the others. */
        onLivePagesChange: (pageId: string) => Promise<void>;
        /** A team's pages are cleared once they've gone, so their addresses are read first. */
        beforeLivePagesChange?: (pageId: string) => Promise<string[]>;
        /** Called before a page goes, so its stored files can go first and be tried again. */
        onPageRemoving: (userId: string, pageId: string, draft: Draft) => Promise<void>;
        /** Gives a new page its own copies of photos that belong to someone else. */
        copyPhotos?: (page: Page, pageId: string) => Promise<Page>;
    },
): void {
    const { scale, limitsOfPerson, onHandleChange, onLivePagesChange, onPageRemoving } = options;
    const { copyPhotos } = options;
    const fail = (
        c: Context,
        status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 503,
        error: string,
        code?: string,
    ) => c.json<ErrorResponse>({ error, ...(code ? { code } : {}) }, status);
    const conflict = (c: Context) =>
        fail(c, 409, "This page was changed somewhere else. Reload to get the latest version.");
    const missing = (c: Context) => fail(c, 404, "We couldn't find that page.");
    const TAKEN = "That address is taken. Try another one.";
    const ONLY_OWNER_LOOK = "Only the team's owner can change the team's look.";

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
    // Adding, deleting and renaming share one limit, so nobody can cycle through names.
    const allowChange = createLimiter(scale(10), 60_000);
    const slowDown = (c: Context) => fail(c, 429, "Too many tries. Wait a little and try again.");
    const pageId = (c: Context) => c.req.param("id") ?? "";
    const isOffline = (draft: Draft) => draft.published && !isPageOnline(draft.standing, limitsOf);
    // What's for the browser, leaving out whose page it is and how its plan was worked out.
    const draftOut = (draft: Draft, id: string): DraftResponse => {
        const { team } = draft;
        const covered = team ? isCovered(draft.standing.team, limitsOf) : false;
        // The look page draws itself, so the owner sees the draft they're changing.
        const look = team && covered && !team.isLookPage ? team.look : null;
        return {
            page: draft.page,
            handle: draft.handle,
            updatedAt: draft.updatedAt,
            published: draft.published,
            changed: draft.changed,
            suspended: draft.suspended,
            offline: isOffline(draft),
            side: draft.side,
            team: team && {
                name: team.name,
                role: team.role,
                lookPageId: team.lookPageId,
                isLookPage: team.lookPageId === id,
                covered,
                look,
                locked: team.isLookPage ? team.role !== "owner" : look !== null,
            },
        };
    };
    const isOwnersLook = (draft: Draft) => draft.team?.isLookPage && draft.team.role !== "owner";

    app.get(routes.pages, async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        return c.json<PagesResponse>({
            pages: (await store.listReachable(person.id)).map(summaryOut),
        });
    });

    app.post(routes.pages, jsonBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowChange(person.id)) return slowDown(c);
        const parsed = newPageRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) {
            return fail(
                c,
                400,
                "Give your page a name, and an address of 1 to 30 lowercase letters, numbers or hyphens.",
            );
        }
        const { name, handle, look, from } = parsed.data;
        const own = await store.listPages(person.id);
        if (!own.length) return fail(c, 409, "Choose your first address first.");
        // A joined page is paid for by the team, so it doesn't use one of this person's.
        const personal = own.filter((other) => other.side === "own").length;
        if (!canAddPage(await limitsOfPerson(person.id), personal)) {
            return fail(c, 403, "You're using all the pages your plan allows.", "plan_limit");
        }
        const source = from ? await store.findDraft(person.id, from) : null;
        if (from && !source) return missing(c);
        const blank = starterPage(name);
        const made: Page = source
            ? { ...source.page, header: { ...source.page.header, name } }
            : { ...blank, look: look ?? blank.look };
        const newId = crypto.randomUUID();
        const page =
            source && source.userId !== person.id && copyPhotos
                ? await copyPhotos(made, newId)
                : made;
        const id = await store.createPage(person.id, handle, page, newId);
        if (!id) return fail(c, 409, TAKEN);
        onHandleChange(null, handle);
        return c.json<NewPageResponse>({ id }, 201);
    });

    app.get(routes.page(":id"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const draft = await store.findDraft(person.id, pageId(c));
        if (!draft) return missing(c);
        return c.json<DraftResponse>(draftOut(draft, pageId(c)));
    });

    app.put(routes.page(":id"), jsonBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowSave(person.id)) return slowDown(c);
        const parsed = saveRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "This page has something that can't be saved.");
        const { page, updatedAt, previous } = parsed.data;
        const id = pageId(c);
        const before = await store.findDraft(person.id, id);
        if (!before) return missing(c);
        if (isOwnersLook(before) && !sameTeamLook(page, before.page)) {
            return fail(c, 403, ONLY_OWNER_LOOK);
        }
        const saved = await store.saveDraft(person.id, id, page, updatedAt);
        if (saved) return c.json<SaveResponse>({ updatedAt: saved });
        const current = await store.findDraft(person.id, id);
        if (!current) return missing(c);
        // The answer to the last save may have been lost on the way back. If what's stored is exactly
        // what this browser last sent, then it's this browser's own work and not someone else's.
        if (previous?.includes(pageHash(current.page))) {
            const again = await store.saveDraft(person.id, id, page, current.updatedAt);
            if (again) return c.json<SaveResponse>({ updatedAt: again });
        }
        return conflict(c);
    });

    app.delete(routes.page(":id"), smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowChange(person.id)) return slowDown(c);
        const draft = await store.findDraft(person.id, pageId(c));
        if (!draft) return missing(c);
        if (draft.suspended)
            return fail(c, 403, "This page was taken down, so it can't be deleted here.");
        const ONLY = "This is your only page, so it can't be deleted here.";
        const id = pageId(c);
        if (draft.side === "teammate") {
            return fail(c, 403, "Only the person whose page this is can delete it.");
        }
        if (draft.side === "joined") {
            return fail(c, 409, "This page is on your team. Leave the team first to delete it.");
        }
        if (draft.side === "team") {
            if (draft.team?.role !== "owner") {
                return fail(c, 403, "Only the team's owner can delete the team's pages.");
            }
            if (draft.team.isLookPage) {
                return fail(c, 409, "This page holds the team's look, so it can't be deleted.");
            }
        } else if ((await store.listPages(person.id)).length < 2) {
            return fail(c, 409, ONLY);
        }
        try {
            await onPageRemoving(person.id, id, draft);
        } catch (error) {
            process.stderr.write(`Couldn't remove a page's photos: ${String(error)}\n`);
            return fail(c, 503, "We couldn't remove this page's photos. Please try again.");
        }
        const affected = (await options.beforeLivePagesChange?.(id)) ?? [];
        if (!(await store.deletePage(person.id, id))) return fail(c, 409, ONLY);
        onHandleChange(draft.handle, null);
        for (const handle of affected) onHandleChange(handle, null);
        return c.body(null, 204);
    });

    app.patch(routes.pageHandle(":id"), smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowChange(person.id)) return slowDown(c);
        const draft = await store.findDraft(person.id, pageId(c));
        if (!draft) return missing(c);
        if (draft.suspended) {
            return fail(c, 403, "This page was taken down, so its address can't be changed.");
        }
        const canChange =
            draft.side === "own" ||
            draft.side === "joined" ||
            (draft.side === "team" && draft.team?.role === "owner");
        if (!canChange) return fail(c, 403, "Only the page's owner can change its address.");
        const parsed = changeHandleRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) {
            return fail(c, 400, "Use 1 to 30 lowercase letters, numbers or hyphens.");
        }
        const { handle } = parsed.data;
        if (!(await store.setHandle(person.id, pageId(c), handle))) return fail(c, 409, TAKEN);
        onHandleChange(draft.handle, handle);
        return c.json<HandleChangedResponse>({ handle });
    });

    // What only the server can know. The editor adds these to its own list before anyone presses Publish.
    const serverIssues = (draft: Draft): PublishIssue[] => {
        const needsPlan = !canPublishStanding(draft.standing, limitsOf);
        const yours = draft.side === "own" || draft.side === "joined";
        const waiting =
            isOwnersLook(draft) && (!draft.liveLook || !sameTeamLook(draft.page, draft.liveLook));
        return [
            ...(draft.suspended ? [{ target: "page", message: SUSPENDED }] : []),
            ...(needsPlan && yours ? [livePageIssue(limitsOf(draft.standing.account))] : []),
            ...(needsPlan && !yours
                ? [
                      {
                          target: "page",
                          message:
                              draft.team?.role === "owner"
                                  ? "A team's pages need you to be on Pro."
                                  : "The team's owner needs to be on Pro to put this page online.",
                          ...(draft.team?.role === "owner" ? { plan: "pro" as const } : {}),
                      },
                  ]
                : []),
            ...(waiting
                ? [
                      {
                          target: "page",
                          message: "The owner has changes to the team's look that aren't live yet.",
                      },
                  ]
                : []),
            ...blockedIssues(draft.page),
        ];
    };

    app.get(routes.publishCheck(":id"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const draft = await store.findDraft(person.id, pageId(c));
        if (!draft) return missing(c);
        return c.json<PublishCheckResponse>({
            issues: serverIssues(draft),
        });
    });

    app.post(routes.publish(":id"), smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowPublish(person.id)) return slowDown(c);
        const parsed = publishRequest.safeParse(await c.req.json<unknown>().catch(() => null));
        if (!parsed.success) return fail(c, 400, "Save your page and try again.");
        const id = pageId(c);
        const draft = await store.findDraft(person.id, id);
        if (!draft) return missing(c);
        const issues = [...serverIssues(draft), ...publishIssues(draft.page)];
        if (issues.length) {
            return c.json<IssuesResponse>({ error: "Fix these before publishing.", issues }, 422);
        }
        if (!(await store.publish(person.id, id, parsed.data.updatedAt))) return conflict(c);
        await onLivePagesChange(id);
        return c.body(null, 204);
    });

    app.post(routes.unpublish(":id"), smallBody, async (c) => {
        if (!isJson(c)) return fail(c, 415, "Send this as JSON.");
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowUnpublish(person.id)) return slowDown(c);
        const draft = await store.findDraft(person.id, pageId(c));
        if (!draft) return missing(c);
        if (isOwnersLook(draft)) {
            return fail(c, 403, "Only the team's owner can take down the page holding its look.");
        }
        await store.unpublish(person.id, pageId(c));
        await onLivePagesChange(pageId(c));
        return c.body(null, 204);
    });

    app.get(routes.live(":id"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        const page = await store.findOwnLive(person.id, pageId(c));
        if (!page) return fail(c, 404, "Your page isn't live.");
        return c.json<LiveResponse>({ page });
    });

    app.get(routes.stats(":id"), async (c) => {
        const person = await currentPerson(c);
        if (!person) return fail(c, 401, "You're not logged in.");
        if (!allowStats(person.id)) return slowDown(c);
        const id = pageId(c);
        if (!(await store.findDraft(person.id, id))) return missing(c);
        const asked = Number(c.req.query("days") ?? STATS_DAYS);
        const days = STAT_RANGES.includes(asked) ? asked : STATS_DAYS;
        const stats = await store.statsFor(person.id, id, days);
        const live = await store.findOwnLive(person.id, id);
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
