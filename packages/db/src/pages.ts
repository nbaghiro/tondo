import { isPlaceholder, pageHash, readPage, teamLookOf } from "@tondo/page";
import type { Page, Standing, TeamLook } from "@tondo/page";
import { and, asc, eq, exists, gte, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "./client";
import { pages, stats, teams, users } from "./schema";

export type TeamRole = "owner" | "editor" | "member";

/** How a page relates to whoever asked: theirs, theirs on a team, the team's, or a teammate's. */
export type PageSide = "own" | "joined" | "team" | "teammate";

export interface DraftTeam {
    id: string;
    name: string;
    /** The role of whoever asked. */
    role: TeamRole;
    lookPageId: string;
    isLookPage: boolean;
    /** What the look page has published. Null if nothing, or its owner was taken down. */
    look: TeamLook | null;
}

export interface Draft {
    page: Page;
    handle: string;
    /** Sent back on the next save, so one tab can't overwrite another's work. */
    updatedAt: string;
    published: boolean;
    /** True when the draft differs from what's live. */
    changed: boolean;
    suspended: boolean;
    /** Whose page it is. Null on a team's own page. */
    userId: string | null;
    side: PageSide;
    standing: Standing;
    team: DraftTeam | null;
    /** The look on the live copy, if there is one. */
    liveLook: TeamLook | null;
}

export interface LivePage {
    id: string;
    page: Page;
    standing: Standing;
    /** What the page's team has published. Whether it applies depends on the owner's plan. */
    teamLook: TeamLook | null;
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
    photo: string | null;
    live: boolean;
    changed: boolean;
    updatedAt: string;
    side: PageSide;
    standing: Standing;
}

export interface PublishedPage {
    handle: string;
    standing: Standing;
}

/** Everything the page routes need from storage, so they can be tested without a database. */
export interface PageStore {
    findLive: (handle: string) => Promise<LivePage | null>;
    /** Every published page of anyone not suspended, with what it takes to tell if it's online. */
    listPublished: () => Promise<PublishedPage[]>;
    /** The person's own pages, oldest first, so the order never moves. */
    listPages: (userId: string) => Promise<PageSummary[]>;
    /** Their own pages and every page they can edit on a team, oldest first. */
    listReachable: (userId: string) => Promise<PageSummary[]>;
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
    createPage: (userId: string, handle: string, page: Page, id?: string) => Promise<string | null>;
    /** False if this is the person's last page, or they can't delete it. */
    deletePage: (userId: string, pageId: string) => Promise<boolean>;
    /** Every draft and live copy this person has, for working out which photos are in use. */
    documentsOf: (userId: string) => Promise<Page[]>;
    /** Points this person's pages at another folder, after their files have been copied there. */
    movePhotos: (userId: string, from: string, to: string) => Promise<void>;
    /** False if the address is taken. */
    setHandle: (userId: string, pageId: string, handle: string) => Promise<boolean>;
    /** The ids of a team's own pages, oldest first. */
    teamPageIds: (teamId: string) => Promise<string[]>;
    documentsOfTeam: (teamId: string) => Promise<Page[]>;
    moveTeamPhotos: (teamId: string, from: string, to: string) => Promise<void>;
    /** The draft and live copy of one page. */
    documentsOfPage: (pageId: string) => Promise<Page[]>;
    replaceInPage: (pageId: string, from: string, to: string) => Promise<void>;
    /** Addresses whose cached answer can change with this person's plan or team. */
    handlesAround: (userId: string) => Promise<string[]>;
    /** Addresses whose cached answer can change when this page goes live or comes down. */
    handlesAffected: (pageId: string) => Promise<string[]>;
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

/** Whether this page is on a team this person owns or edits. Taken down, they reach only their own. */
const onTeamIEdit = (userId: string) => sql`${pages.teamId} in (
    select t.id from teams t join users u on u.id = ${userId}
    where u.suspended_at is null and (t.owner_id = u.id or (u.editor and exists (
        select 1 from pages mine where mine.user_id = u.id and mine.team_id = t.id
    )))
)`;

/** The one place that picks a page. It always checks who's asking, and a malformed id finds nothing. */
const pageOf = (userId: string, pageId: string) =>
    UUID.test(pageId)
        ? and(eq(pages.id, pageId), or(eq(pages.userId, userId), onTeamIEdit(userId)))
        : sql`false`;

const onTeamIOwn = (userId: string) => sql`${pages.teamId} in (
    select t.id from teams t join users u on u.id = t.owner_id
    where t.owner_id = ${userId} and u.suspended_at is null
)`;

const isLookPage = sql`${pages.id} = (
    select l.id from pages l where l.team_id = ${pages.teamId} and l.user_id is null
    order by l.created_at, l.id limit 1
)`;

const isUniqueViolation = (error: unknown): boolean => {
    const { code, cause } = error as { code?: unknown; cause?: { code?: unknown } };
    return code === "23505" || cause?.code === "23505";
};

const person = alias(users, "person");
const owner = alias(users, "owner");
const isOlder = sql`(older.created_at, older.id) < (${pages.createdAt}, ${pages.id})`;

// Each page with everything that says whether visitors can see it. The team is the page's own or, for a
// person's other pages, the one their joined page is on, because that decides what they count against.
const pageRows = (db: Db, where: SQL | undefined) =>
    db
        .select({
            id: pages.id,
            userId: pages.userId,
            teamId: pages.teamId,
            handle: pages.handle,
            draft: pages.draft,
            published: pages.published,
            updatedAt: stamp,
            personPlan: person.plan,
            personEnds: person.endsAt,
            personPacks: person.packs,
            personSuspended: person.suspendedAt,
            ownerId: teams.ownerId,
            ownerPlan: owner.plan,
            ownerEnds: owner.endsAt,
            ownerPacks: owner.packs,
            ownerSuspended: owner.suspendedAt,
            rank: sql<number>`(
                select count(*)::int from ${pages} older
                where older.user_id = ${pages.userId} and older.team_id is null
                    and older.published is not null and ${isOlder}
            )`,
            joinedOlder: sql<boolean>`exists (
                select 1 from ${pages} older
                where older.user_id = ${pages.userId} and older.team_id is not null
                    and older.published is not null and ${isOlder}
            )`,
            teamRank: sql<number>`(
                select count(*)::int from ${pages} older
                where older.team_id = ${pages.teamId}
                    and older.published is not null and ${isOlder}
            )`,
            teamLive: sql<number>`(
                select count(*)::int from ${pages} older
                where older.team_id = ${pages.teamId} and older.published is not null
            )`,
            personalLive: sql<number>`(
                select count(*)::int from ${pages} older
                where older.user_id = ${pages.userId} and older.team_id is null
                    and older.published is not null
            )`,
            joinedLive: sql<boolean>`exists (
                select 1 from ${pages} older
                where older.user_id = ${pages.userId} and older.team_id is not null
                    and older.published is not null
            )`,
        })
        .from(pages)
        .leftJoin(person, eq(pages.userId, person.id))
        .leftJoin(
            teams,
            sql`${teams.id} = coalesce(${pages.teamId}, (
                select j.team_id from pages j
                where j.user_id = ${pages.userId} and j.team_id is not null
            ))`,
        )
        .leftJoin(owner, eq(teams.ownerId, owner.id))
        .where(where);

type PageRow = Awaited<ReturnType<typeof pageRows>>[number];

const standingOf = (row: PageRow): Standing => {
    const team = row.ownerPlan
        ? { plan: row.ownerPlan, endsAt: row.ownerEnds, packs: row.ownerPacks ?? 1 }
        : null;
    return {
        kind: row.userId === null ? "team" : row.teamId ? "joined" : "personal",
        account:
            row.userId === null
                ? (team ?? { plan: "free", endsAt: null })
                : {
                      plan: row.personPlan ?? "free",
                      endsAt: row.personEnds,
                      packs: row.personPacks ?? 1,
                  },
        team,
        rank: row.rank,
        joinedOlder: row.joinedOlder,
        personalLive: row.personalLive,
        joinedLive: row.joinedLive,
        published: row.published !== null,
        teamRank: row.teamRank,
        teamLive: row.teamLive,
    };
};

const sideOf = (row: Pick<PageRow, "userId" | "teamId">, userId: string): PageSide => {
    if (row.userId === null) return "team";
    if (row.userId !== userId) return "teammate";
    return row.teamId ? "joined" : "own";
};

const isUp = or(
    and(isNotNull(pages.userId), isNull(person.suspendedAt)),
    and(isNull(pages.userId), isNull(owner.suspendedAt)),
);

const OLDEST_FIRST = [asc(pages.createdAt), asc(pages.id)];

const summaryOf = (row: PageRow, userId: string): PageSummary => {
    const page = readPage(row.draft);
    return {
        id: row.id,
        handle: row.handle,
        name: page.header.name,
        look: page.look,
        seed: page.seed ?? null,
        photo: isPlaceholder(page.header.photo) ? null : (page.header.photo?.file ?? null),
        live: row.published !== null,
        changed: row.published === null || pageHash(page) !== pageHash(readPage(row.published)),
        updatedAt: row.updatedAt,
        side: sideOf(row, userId),
        standing: standingOf(row),
    };
};

export async function listPagesOf(db: Db, userId: string): Promise<PageSummary[]> {
    const rows = await pageRows(db, eq(pages.userId, userId)).orderBy(...OLDEST_FIRST);
    return rows.map((row) => summaryOf(row, userId));
}

export async function listReachableBy(db: Db, userId: string): Promise<PageSummary[]> {
    const rows = await pageRows(db, or(eq(pages.userId, userId), onTeamIEdit(userId))).orderBy(
        ...OLDEST_FIRST,
    );
    return rows.map((row) => summaryOf(row, userId));
}

/** A team's own pages, oldest first, so the first holds its look. */
export async function listOwnOfTeam(
    db: Db,
    teamId: string,
    userId: string,
): Promise<PageSummary[]> {
    const rows = await pageRows(db, and(eq(pages.teamId, teamId), isNull(pages.userId))).orderBy(
        ...OLDEST_FIRST,
    );
    return rows.map((row) => summaryOf(row, userId));
}

const lookPageOf = async (db: Db, teamId: string) => {
    const [row] = await db
        .select({ id: pages.id, draft: pages.draft, published: pages.published })
        .from(pages)
        .where(and(eq(pages.teamId, teamId), isNull(pages.userId)))
        .orderBy(...OLDEST_FIRST)
        .limit(1);
    return row ?? null;
};

// Moving `updated_at` means a tab still holding the old paths can't save over this.
const replacing = async (db: Db, where: SQL | undefined, from: string, to: string) => {
    const moved = (column: typeof pages.draft | typeof pages.published) =>
        sql`replace(${column}::text, ${from}, ${to})::jsonb`;
    await db
        .update(pages)
        .set({
            draft: moved(pages.draft),
            published: moved(pages.published),
            updatedAt: sql`now()`,
        })
        .where(where);
};

export function createPageStore(db: Db): PageStore {
    return {
        findLive: async (handle) => {
            const [row] = await pageRows(db, and(eq(pages.handle, handle), isUp)).limit(1);
            if (!row?.published) return null;
            const look =
                row.teamId && !row.ownerSuspended ? await lookPageOf(db, row.teamId) : null;
            return {
                id: row.id,
                page: read(row.published),
                standing: standingOf(row),
                teamLook: look?.published ? teamLookOf(readPage(look.published)) : null,
            };
        },
        listPublished: async () => {
            const rows = await pageRows(db, and(isNotNull(pages.published), isUp));
            return rows.map((row) => ({ handle: row.handle, standing: standingOf(row) }));
        },
        listPages: (userId) => listPagesOf(db, userId),
        listReachable: (userId) => listReachableBy(db, userId),
        findDraft: async (userId, pageId) => {
            const [row] = await pageRows(db, pageOf(userId, pageId)).limit(1);
            if (!row) return null;
            const page = read(row.draft);
            const live = row.published ? readPage(row.published) : null;
            let team: DraftTeam | null = null;
            const look = row.teamId ? await lookPageOf(db, row.teamId) : null;
            if (row.teamId && look) {
                const [me] = await db
                    .select({ editor: users.editor })
                    .from(users)
                    .where(eq(users.id, userId));
                team = {
                    id: row.teamId,
                    name: readPage(look.draft).header.name,
                    role: row.ownerId === userId ? "owner" : me?.editor ? "editor" : "member",
                    lookPageId: look.id,
                    isLookPage: look.id === row.id,
                    look:
                        look.published && !row.ownerSuspended
                            ? teamLookOf(readPage(look.published))
                            : null,
                };
            }
            return {
                page,
                handle: row.handle,
                updatedAt: row.updatedAt,
                published: live !== null,
                changed: live === null || pageHash(page) !== pageHash(live),
                suspended:
                    (row.userId === null ? row.ownerSuspended : row.personSuspended) !== null,
                userId: row.userId,
                side: sideOf(row, userId),
                standing: standingOf(row),
                team,
                liveLook: live ? teamLookOf(live) : null,
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
        createPage: async (userId, handle, page, id) => {
            const [row] = await db
                .insert(pages)
                .values({ ...(id ? { id } : {}), userId, handle, draft: page })
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
            // Someone's joined page stays until they leave, and a team keeps the page holding its look.
            const rows = await db
                .delete(pages)
                .where(
                    and(
                        eq(pages.id, pageId),
                        or(
                            and(eq(pages.userId, userId), isNull(pages.teamId), exists(others)),
                            and(isNull(pages.userId), onTeamIOwn(userId), sql`not (${isLookPage})`),
                        ),
                    ),
                )
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
            await replacing(db, eq(pages.userId, userId), from, to);
        },
        setHandle: async (userId, pageId, handle) => {
            try {
                await db
                    .update(pages)
                    .set({ handle })
                    .where(
                        and(
                            pageOf(userId, pageId),
                            or(
                                eq(pages.userId, userId),
                                and(isNull(pages.userId), onTeamIOwn(userId)),
                            ),
                        ),
                    );
                return true;
            } catch (error) {
                if (isUniqueViolation(error)) return false;
                throw error;
            }
        },
        teamPageIds: async (teamId) => {
            const rows = await db
                .select({ id: pages.id })
                .from(pages)
                .where(and(eq(pages.teamId, teamId), isNull(pages.userId)))
                .orderBy(...OLDEST_FIRST);
            return rows.map((row) => row.id);
        },
        documentsOfTeam: async (teamId) => {
            const rows = await db
                .select({ draft: pages.draft, published: pages.published })
                .from(pages)
                .where(and(eq(pages.teamId, teamId), isNull(pages.userId)));
            return rows.flatMap((row) =>
                row.published ? [read(row.draft), read(row.published)] : [read(row.draft)],
            );
        },
        moveTeamPhotos: async (teamId, from, to) => {
            await replacing(db, and(eq(pages.teamId, teamId), isNull(pages.userId)), from, to);
        },
        documentsOfPage: async (pageId) => {
            const rows = await db
                .select({ draft: pages.draft, published: pages.published })
                .from(pages)
                .where(eq(pages.id, pageId));
            return rows.flatMap((row) =>
                row.published ? [read(row.draft), read(row.published)] : [read(row.draft)],
            );
        },
        replaceInPage: async (pageId, from, to) => {
            await replacing(db, eq(pages.id, pageId), from, to);
        },
        handlesAround: async (userId) => {
            const rows = await db.select({ handle: pages.handle }).from(pages)
                .where(sql`${pages.userId} = ${userId}
                    or ${pages.teamId} in (select id from teams where owner_id = ${userId})
                    or ${pages.userId} in (
                        select j.user_id from pages j join teams t on t.id = j.team_id
                        where t.owner_id = ${userId}
                    )`);
            return rows.map((row) => row.handle);
        },
        handlesAffected: async (pageId) => {
            const rows = await db.select({ handle: pages.handle }).from(pages)
                .where(sql`${pages.id} = ${pageId}
                    or ${pages.userId} = (select p.user_id from pages p where p.id = ${pageId})
                    or ${pages.teamId} = (
                        select p.team_id from pages p where p.id = ${pageId} and p.user_id is null
                    )`);
            return rows.map((row) => row.handle);
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
