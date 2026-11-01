import { pageHash, readPage } from "@tondo/page";
import type { Page, Plan } from "@tondo/page";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { Db } from "./client";
import { pages, stats, users } from "./schema";

const MAIN_PAGE = "";

export interface Draft {
    page: Page;
    /** Sent back on the next save, so one tab can't overwrite another's work. */
    updatedAt: string;
    published: boolean;
    /** True when the draft differs from what's live. */
    changed: boolean;
    suspended: boolean;
}

export interface LivePage {
    id: string;
    page: Page;
    plan: Plan;
    endsAt: Date | null;
}

export interface PageStats {
    views: number;
    clicks: number;
    days: { day: string; views: number; clicks: number }[];
    /** Clicks by the id each link is counted under. */
    targets: { target: string; clicks: number }[];
}

/** Everything the page routes need from storage, so they can be tested without a database. */
export interface PageStore {
    findLive: (handle: string) => Promise<LivePage | null>;
    handleOf: (userId: string) => Promise<string | null>;
    findDraft: (userId: string) => Promise<Draft | null>;
    /** Null if someone saved since `updatedAt`. */
    saveDraft: (userId: string, page: Page, updatedAt: string) => Promise<string | null>;
    /** False if someone saved since `updatedAt`. Otherwise the draft, or the page given, is live. */
    publish: (userId: string, updatedAt: string, page?: Page) => Promise<boolean>;
    unpublish: (userId: string) => Promise<void>;
    count: (pageId: string, target: string, by?: number) => Promise<void>;
    /** What's live for this person, for naming the links in their numbers. */
    findOwnLive: (userId: string) => Promise<Page | null>;
    statsFor: (userId: string, days: number) => Promise<PageStats>;
}

// Read as text and compared in the database, because a JS Date would lose the microseconds.
const stamp = sql<string>`${pages.updatedAt}::text`;
const isStamp = (value: string) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value);
const isUnchanged = (updatedAt: string) =>
    isStamp(updatedAt) ? sql`${pages.updatedAt} = ${updatedAt}::timestamptz` : sql`false`;

// A block that couldn't be read is kept and left off the page, so someone needs to hear about it.
function read(raw: unknown): Page {
    const page = readPage(raw);
    if (page.unreadable?.length) {
        process.stderr.write(`A page has ${String(page.unreadable.length)} unreadable blocks.\n`);
    }
    return page;
}
const mainPageOf = (userId: string) => and(eq(pages.userId, userId), eq(pages.slug, MAIN_PAGE));

export function createPageStore(db: Db): PageStore {
    return {
        findLive: async (handle) => {
            const [row] = await db
                .select({
                    id: pages.id,
                    published: pages.published,
                    plan: users.plan,
                    endsAt: users.endsAt,
                })
                .from(pages)
                .innerJoin(users, eq(pages.userId, users.id))
                .where(
                    and(
                        eq(users.handle, handle),
                        eq(pages.slug, MAIN_PAGE),
                        isNull(users.suspendedAt),
                    ),
                )
                .limit(1);
            return row?.published
                ? { id: row.id, page: read(row.published), plan: row.plan, endsAt: row.endsAt }
                : null;
        },
        handleOf: async (userId) => {
            const [row] = await db
                .select({ handle: users.handle })
                .from(users)
                .where(eq(users.id, userId));
            return row?.handle ?? null;
        },
        findDraft: async (userId) => {
            const [row] = await db
                .select({
                    draft: pages.draft,
                    published: pages.published,
                    updatedAt: stamp,
                    suspendedAt: users.suspendedAt,
                })
                .from(pages)
                .innerJoin(users, eq(pages.userId, users.id))
                .where(mainPageOf(userId))
                .limit(1);
            if (!row) return null;
            const page = read(row.draft);
            return {
                page,
                updatedAt: row.updatedAt,
                published: row.published !== null,
                changed:
                    row.published === null || pageHash(page) !== pageHash(readPage(row.published)),
                suspended: row.suspendedAt !== null,
            };
        },
        saveDraft: async (userId, page, updatedAt) => {
            const [row] = await db
                .update(pages)
                .set({ draft: page, updatedAt: sql`now()` })
                .where(and(mainPageOf(userId), isUnchanged(updatedAt)))
                .returning({ updatedAt: stamp });
            return row?.updatedAt ?? null;
        },
        publish: async (userId, updatedAt, page) => {
            const rows = await db
                .update(pages)
                .set({ published: page ?? sql`${pages.draft}` })
                .where(and(mainPageOf(userId), isUnchanged(updatedAt)))
                .returning({ id: pages.id });
            return rows.length > 0;
        },
        unpublish: async (userId) => {
            await db.update(pages).set({ published: null }).where(mainPageOf(userId));
        },
        findOwnLive: async (userId) => {
            const [row] = await db
                .select({ published: pages.published })
                .from(pages)
                .where(mainPageOf(userId))
                .limit(1);
            return row?.published ? read(row.published) : null;
        },
        count: async (pageId, target, by = 1) => {
            const day = new Date().toISOString().slice(0, 10);
            await db
                .insert(stats)
                .values({ pageId, target, day, count: by })
                .onConflictDoUpdate({
                    target: [stats.pageId, stats.target, stats.day],
                    set: { count: sql`${stats.count} + ${by}` },
                });
        },
        statsFor: async (userId, days) => {
            const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
            const rows = await db
                .select({ target: stats.target, day: stats.day, count: stats.count })
                .from(stats)
                .innerJoin(pages, eq(stats.pageId, pages.id))
                .where(and(mainPageOf(userId), gte(stats.day, since)));
            return summarise(rows, days);
        },
    };
}

/** Adds up daily rows, with every day in the range present, even those with nothing. */
export function summarise(
    rows: readonly { target: string; day: string; count: number }[],
    days: number,
    now = new Date(),
): PageStats {
    const byDay = new Map<string, { day: string; views: number; clicks: number }>();
    for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
        byDay.set(day, { day, views: 0, clicks: 0 });
    }
    const targets = new Map<string, number>();
    for (const row of rows) {
        const entry = byDay.get(row.day);
        if (!entry) continue;
        if (row.target) {
            entry.clicks += row.count;
            targets.set(row.target, (targets.get(row.target) ?? 0) + row.count);
        } else {
            entry.views += row.count;
        }
    }
    const list = [...byDay.values()];
    return {
        views: list.reduce((sum, entry) => sum + entry.views, 0),
        clicks: list.reduce((sum, entry) => sum + entry.clicks, 0),
        days: list,
        targets: [...targets]
            .map(([target, clicks]) => ({ target, clicks }))
            .sort((a, b) => b.clicks - a.clicks),
    };
}

/** Publishes a main page for a made-up user. For seed data. */
export async function seedUser(db: Db, handle: string, page: Page): Promise<void> {
    const userId = `seed-${handle}`;
    await db.transaction(async (tx) => {
        // Example pages carry no mark.
        await tx
            .insert(users)
            .values({ id: userId, handle, plan: "pro" })
            .onConflictDoUpdate({ target: users.id, set: { plan: "pro" } });
        await tx
            .insert(pages)
            .values({ userId, slug: MAIN_PAGE, draft: page, published: page })
            .onConflictDoUpdate({
                target: [pages.userId, pages.slug],
                set: { draft: page, published: page, updatedAt: new Date() },
            });
    });
}
