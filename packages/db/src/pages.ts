import { readPage } from "@tondo/page";
import type { Page } from "@tondo/page";
import { and, eq, gte, sql } from "drizzle-orm";
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
}

export interface LivePage {
    id: string;
    page: Page;
}

export interface PageStats {
    views: number;
    clicks: number;
}

/** Everything the page routes need from storage, so they can be tested without a database. */
export interface PageStore {
    findLive: (handle: string) => Promise<LivePage | null>;
    findDraft: (userId: string) => Promise<Draft | null>;
    /** Null if someone saved since `updatedAt`. */
    saveDraft: (userId: string, page: Page, updatedAt: string) => Promise<string | null>;
    /** Null if someone saved since `updatedAt`. Otherwise the draft is live. */
    publish: (userId: string, updatedAt: string) => Promise<boolean>;
    count: (pageId: string, target: string) => Promise<void>;
    statsFor: (userId: string, days: number) => Promise<PageStats>;
}

// Read as text and compared in the database, because a JS Date would lose the microseconds.
const stamp = sql<string>`${pages.updatedAt}::text`;
const isUnchanged = (updatedAt: string) => sql`${pages.updatedAt} = ${updatedAt}::timestamptz`;
const mainPageOf = (userId: string) => and(eq(pages.userId, userId), eq(pages.slug, MAIN_PAGE));

export function createPageStore(db: Db): PageStore {
    return {
        findLive: async (handle) => {
            const [row] = await db
                .select({ id: pages.id, published: pages.published })
                .from(pages)
                .innerJoin(users, eq(pages.userId, users.id))
                .where(and(eq(users.handle, handle), eq(pages.slug, MAIN_PAGE)))
                .limit(1);
            return row?.published ? { id: row.id, page: readPage(row.published) } : null;
        },
        findDraft: async (userId) => {
            const [row] = await db
                .select({ draft: pages.draft, published: pages.published, updatedAt: stamp })
                .from(pages)
                .where(mainPageOf(userId))
                .limit(1);
            if (!row) return null;
            const page = readPage(row.draft);
            return {
                page,
                updatedAt: row.updatedAt,
                published: row.published !== null,
                changed:
                    row.published === null ||
                    JSON.stringify(page) !== JSON.stringify(readPage(row.published)),
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
        publish: async (userId, updatedAt) => {
            const rows = await db
                .update(pages)
                .set({ published: sql`${pages.draft}` })
                .where(and(mainPageOf(userId), isUnchanged(updatedAt)))
                .returning({ id: pages.id });
            return rows.length > 0;
        },
        count: async (pageId, target) => {
            const day = new Date().toISOString().slice(0, 10);
            await db
                .insert(stats)
                .values({ pageId, target, day, count: 1 })
                .onConflictDoUpdate({
                    target: [stats.pageId, stats.target, stats.day],
                    set: { count: sql`${stats.count} + 1` },
                });
        },
        statsFor: async (userId, days) => {
            const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
            const rows = await db
                .select({ target: stats.target, count: stats.count })
                .from(stats)
                .innerJoin(pages, eq(stats.pageId, pages.id))
                .where(and(mainPageOf(userId), gte(stats.day, since)));
            return rows.reduce<PageStats>(
                (total, row) =>
                    row.target
                        ? { ...total, clicks: total.clicks + row.count }
                        : { ...total, views: total.views + row.count },
                { views: 0, clicks: 0 },
            );
        },
    };
}

/** Publishes a main page for a made-up user. For seed data. */
export async function seedUser(db: Db, handle: string, page: Page): Promise<void> {
    const userId = `seed-${handle}`;
    await db.transaction(async (tx) => {
        await tx.insert(users).values({ id: userId, handle }).onConflictDoNothing();
        await tx
            .insert(pages)
            .values({ userId, slug: MAIN_PAGE, draft: page, published: page })
            .onConflictDoUpdate({
                target: [pages.userId, pages.slug],
                set: { draft: page, published: page, updatedAt: new Date() },
            });
    });
}
