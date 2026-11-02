import { pageHash, readPage } from "@tondo/page";
import type { Page, Plan } from "@tondo/page";
import { and, asc, eq, exists, gte, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "./client";
import { pages, stats, users } from "./schema";

export interface Draft {
    page: Page;
    handle: string;
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
    /** How many of this person's live pages are older than this one. */
    rank: number;
}

export interface PageStats {
    views: number;
    clicks: number;
    days: { day: string; views: number; clicks: number }[];
    /** Clicks by the id each link is counted under. */
    targets: { target: string; clicks: number }[];
}

/** One line about a page, for choosing between them. */
export interface PageSummary {
    id: string;
    handle: string;
    name: string;
    look: string;
    seed: number | null;
    live: boolean;
    changed: boolean;
    updatedAt: string;
}

/** Everything the page routes need from storage, so they can be tested without a database. */
export interface PageStore {
    findLive: (handle: string) => Promise<LivePage | null>;
    /** Oldest first, so the order never moves. */
    listPages: (userId: string) => Promise<PageSummary[]>;
    findDraft: (userId: string, pageId: string) => Promise<Draft | null>;
    /** Null if someone saved since `updatedAt`. */
    saveDraft: (
        userId: string,
        pageId: string,
        page: Page,
        updatedAt: string,
    ) => Promise<string | null>;
    /** False if someone saved since `updatedAt`. Otherwise the draft is live. */
    publish: (userId: string, pageId: string, updatedAt: string) => Promise<boolean>;
    unpublish: (userId: string, pageId: string) => Promise<void>;
    count: (pageId: string, target: string, by?: number) => Promise<void>;
    /** What's live on this page, for naming the links in its numbers. */
    findOwnLive: (userId: string, pageId: string) => Promise<Page | null>;
    statsFor: (userId: string, pageId: string, days: number) => Promise<PageStats>;
    /** The new page's id, or null if the address is taken. */
    createPage: (userId: string, handle: string, page: Page) => Promise<string | null>;
    /** False if this is the person's last page, or isn't theirs. */
    deletePage: (userId: string, pageId: string) => Promise<boolean>;
    /** Every draft and live copy this person has, for working out which photos are in use. */
    documentsOf: (userId: string) => Promise<Page[]>;
    /** Points this person's pages at another folder, after their files have been copied there. */
    movePhotos: (userId: string, from: string, to: string) => Promise<void>;
    /** False if the address is taken. */
    setHandle: (userId: string, pageId: string, handle: string) => Promise<boolean>;
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The one place that picks a page. It always checks whose it is, and a malformed id finds nothing. */
const pageOf = (userId: string, pageId: string) =>
    UUID.test(pageId) ? and(eq(pages.userId, userId), eq(pages.id, pageId)) : sql`false`;

const isUniqueViolation = (error: unknown): boolean => {
    const { code, cause } = error as { code?: unknown; cause?: { code?: unknown } };
    return code === "23505" || cause?.code === "23505";
};

export async function listPagesOf(db: Db, userId: string): Promise<PageSummary[]> {
    const rows = await db
        .select({
            id: pages.id,
            handle: pages.handle,
            draft: pages.draft,
            published: pages.published,
            updatedAt: stamp,
        })
        .from(pages)
        .where(eq(pages.userId, userId))
        .orderBy(asc(pages.createdAt), asc(pages.id));
    return rows.map((row) => {
        const page = readPage(row.draft);
        return {
            id: row.id,
            handle: row.handle,
            name: page.header.name,
            look: page.look,
            seed: page.seed ?? null,
            live: row.published !== null,
            changed: row.published === null || pageHash(page) !== pageHash(readPage(row.published)),
            updatedAt: row.updatedAt,
        };
    });
}

export function createPageStore(db: Db): PageStore {
    return {
        findLive: async (handle) => {
            const [row] = await db
                .select({
                    id: pages.id,
                    published: pages.published,
                    plan: users.plan,
                    endsAt: users.endsAt,
                    rank: sql<number>`(
                        select count(*)::int from ${pages} older
                        where older.user_id = ${pages.userId}
                            and older.published is not null
                            and (older.created_at, older.id) < (${pages.createdAt}, ${pages.id})
                    )`,
                })
                .from(pages)
                .innerJoin(users, eq(pages.userId, users.id))
                .where(and(eq(pages.handle, handle), isNull(users.suspendedAt)))
                .limit(1);
            return row?.published
                ? {
                      id: row.id,
                      page: read(row.published),
                      plan: row.plan,
                      endsAt: row.endsAt,
                      rank: row.rank,
                  }
                : null;
        },
        listPages: (userId) => listPagesOf(db, userId),
        findDraft: async (userId, pageId) => {
            const [row] = await db
                .select({
                    handle: pages.handle,
                    draft: pages.draft,
                    published: pages.published,
                    updatedAt: stamp,
                    suspendedAt: users.suspendedAt,
                })
                .from(pages)
                .innerJoin(users, eq(pages.userId, users.id))
                .where(pageOf(userId, pageId))
                .limit(1);
            if (!row) return null;
            const page = read(row.draft);
            return {
                page,
                handle: row.handle,
                updatedAt: row.updatedAt,
                published: row.published !== null,
                changed:
                    row.published === null || pageHash(page) !== pageHash(readPage(row.published)),
                suspended: row.suspendedAt !== null,
            };
        },
        saveDraft: async (userId, pageId, page, updatedAt) => {
            const [row] = await db
                .update(pages)
                .set({ draft: page, updatedAt: sql`now()` })
                .where(and(pageOf(userId, pageId), isUnchanged(updatedAt)))
                .returning({ updatedAt: stamp });
            return row?.updatedAt ?? null;
        },
        publish: async (userId, pageId, updatedAt) => {
            const rows = await db
                .update(pages)
                .set({ published: sql`${pages.draft}` })
                .where(and(pageOf(userId, pageId), isUnchanged(updatedAt)))
                .returning({ id: pages.id });
            return rows.length > 0;
        },
        unpublish: async (userId, pageId) => {
            await db.update(pages).set({ published: null }).where(pageOf(userId, pageId));
        },
        findOwnLive: async (userId, pageId) => {
            const [row] = await db
                .select({ published: pages.published })
                .from(pages)
                .where(pageOf(userId, pageId))
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
        statsFor: async (userId, pageId, days) => {
            const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
            const rows = await db
                .select({ target: stats.target, day: stats.day, count: stats.count })
                .from(stats)
                .innerJoin(pages, eq(stats.pageId, pages.id))
                .where(and(pageOf(userId, pageId), gte(stats.day, since)));
            return summarise(rows, days);
        },
        createPage: async (userId, handle, page) => {
            const [row] = await db
                .insert(pages)
                .values({ userId, handle, draft: page })
                .onConflictDoNothing({ target: pages.handle })
                .returning({ id: pages.id });
            return row?.id ?? null;
        },
        deletePage: async (userId, pageId) => {
            if (!UUID.test(pageId)) return false;
            const others = db
                .select({ id: pages.id })
                .from(pages)
                .where(and(eq(pages.userId, userId), ne(pages.id, pageId)));
            const rows = await db
                .delete(pages)
                .where(and(pageOf(userId, pageId), exists(others)))
                .returning({ id: pages.id });
            return rows.length > 0;
        },
        documentsOf: async (userId) => {
            const rows = await db
                .select({ draft: pages.draft, published: pages.published })
                .from(pages)
                .where(eq(pages.userId, userId));
            return rows.flatMap((row) =>
                row.published ? [read(row.draft), read(row.published)] : [read(row.draft)],
            );
        },
        movePhotos: async (userId, from, to) => {
            const moved = (column: typeof pages.draft | typeof pages.published) =>
                sql`replace(${column}::text, ${from}, ${to})::jsonb`;
            // Moving `updated_at` means a tab still holding the old paths can't save over this.
            await db
                .update(pages)
                .set({
                    draft: moved(pages.draft),
                    published: moved(pages.published),
                    updatedAt: sql`now()`,
                })
                .where(eq(pages.userId, userId));
        },
        setHandle: async (userId, pageId, handle) => {
            try {
                await db.update(pages).set({ handle }).where(pageOf(userId, pageId));
                return true;
            } catch (error) {
                if (isUniqueViolation(error)) return false;
                throw error;
            }
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

/** Publishes a page for a made-up user. For seed data. */
export async function seedUser(db: Db, handle: string, page: Page): Promise<void> {
    const userId = `seed-${handle}`;
    await db.transaction(async (tx) => {
        // Example pages stay online.
        await tx
            .insert(users)
            .values({ id: userId, plan: "pro" })
            .onConflictDoUpdate({ target: users.id, set: { plan: "pro" } });
        await tx
            .insert(pages)
            .values({ userId, handle, draft: page, published: page })
            .onConflictDoUpdate({
                target: pages.handle,
                set: { draft: page, published: page, updatedAt: new Date() },
                setWhere: eq(pages.userId, userId),
            });
    });
}
