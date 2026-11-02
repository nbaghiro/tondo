import { readPage, starterPage } from "@tondo/page";
import type { Account, Page } from "@tondo/page";
import { and, asc, count, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import { listOwnOfTeam } from "./pages";
import type { PageSummary, TeamRole } from "./pages";
import { pages, teams, users } from "./schema";

/** One line on the team's list. People are named by their joined page's address. */
export interface TeamPerson {
    pageId: string | null;
    handle: string | null;
    name: string;
    photo: string | null;
    role: TeamRole;
    you: boolean;
    live: boolean;
}

export interface TeamView {
    id: string;
    ownerId: string;
    /** How many pages are on the team. */
    held: number;
    /** The name and address on the team's look page. */
    name: string;
    handle: string;
    lookPageId: string;
    lookLive: boolean;
    role: TeamRole;
    owner: Account;
    ownerSuspended: boolean;
    invitesFrom: Date;
    people: TeamPerson[];
    /** The team's own pages, oldest first, for whoever can edit them. Otherwise empty. */
    pages: PageSummary[];
    /** This person's page on the team. */
    myPageId: string | null;
}

/** What an invitation shows, before anyone has joined. */
export interface TeamInvite {
    id: string;
    ownerId: string;
    name: string;
    handle: string;
    owner: Account;
    ownerSuspended: boolean;
    invitesFrom: Date;
    look: Page | null;
    held: number;
    /** The page the link names, while it's still waiting for its person. */
    made: { id: string; handle: string; name: string } | null;
}

export type CreateResult = { id: string } | "on-team" | "taken" | "missing";
export type JoinResult = { handle: string } | "on-team" | "ended" | "full" | "taken" | "missing";

export interface TeamStore {
    find: (userId: string) => Promise<TeamView | null>;
    invite: (teamId: string, pageId: string | null) => Promise<TeamInvite | null>;
    /** Who should spend Help me credits for this person, and their plan, if they're on a team. */
    ownerOf: (userId: string) => Promise<{ id: string; account: Account } | null>;
    create: (
        userId: string,
        team: { handle: string; page: Page; join: string | null },
    ) => Promise<CreateResult>;
    /** Adds a person to a team, with one of their pages or with the page named as made for them. */
    join: (
        teamId: string,
        userId: string,
        page: { own: string } | { made: string },
        most: number,
    ) => Promise<JoinResult>;
    leave: (userId: string) => Promise<"owner" | "missing" | "left">;
    remove: (teamId: string, handle: string) => Promise<{ userId: string } | "owner" | "missing">;
    setRole: (
        teamId: string,
        handle: string,
        editor: boolean,
    ) => Promise<"owner" | "missing" | "set">;
    /** Changes which of this person's pages is on the team. Only an owner can have none. */
    setPage: (
        teamId: string,
        userId: string,
        pageId: string | null,
        most: number,
    ) => Promise<boolean>;
    addPage: (
        teamId: string,
        page: { id: string; handle: string; draft: Page },
        most: number,
    ) => Promise<"added" | "full" | "taken">;
    endInvites: (teamId: string) => Promise<void>;
    /** Whoever holds this team's page named by the link becomes the owner. */
    takeOver: (teamId: string, userId: string, pageId: string) => Promise<boolean>;
    /** Clears joined pages, then deletes the team and its own pages. Returns the addresses involved. */
    deleteTeam: (teamId: string) => Promise<string[]>;
}

const nameOf = (draft: unknown) => readPage(draft).header.name;
const photoOf = (draft: unknown) => readPage(draft).header.photo?.file ?? null;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const lockTeam = async (tx: Tx, teamId: string) => {
    const [team] = await tx.select().from(teams).where(eq(teams.id, teamId)).for("update");
    return team ?? null;
};

/** The oldest of a team's own pages, which holds its look and can't be deleted or claimed. */
const lookPageId = async (tx: Db | Tx, teamId: string) => {
    const [page] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.teamId, teamId), isNull(pages.userId)))
        .orderBy(asc(pages.createdAt), asc(pages.id))
        .limit(1);
    return page?.id ?? null;
};

const isOnTeam = async (tx: Tx, userId: string) => {
    const [row] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.userId, userId), isNotNull(pages.teamId)))
        .limit(1);
    if (row) return true;
    const [owned] = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.ownerId, userId))
        .limit(1);
    return owned !== undefined;
};

/** What a team's room is used by: its own pages and everyone's joined page. */
const pagesHeld = async (tx: Db | Tx, teamId: string) => {
    const [row] = await tx.select({ held: count() }).from(pages).where(eq(pages.teamId, teamId));
    return row?.held ?? 0;
};

const teamIdOf = async (db: Db | Tx, userId: string) => {
    const [row] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
            or(
                eq(teams.ownerId, userId),
                inArray(
                    teams.id,
                    db
                        .select({ id: sql<string>`${pages.teamId}` })
                        .from(pages)
                        .where(and(eq(pages.userId, userId), isNotNull(pages.teamId))),
                ),
            ),
        )
        .limit(1);
    return row?.id ?? null;
};

const FIRST_PAGE = "missing";

export function createTeamStore(db: Db): TeamStore {
    const accountOf = async (userId: string) => {
        const [row] = await db
            .select({
                plan: users.plan,
                endsAt: users.endsAt,
                packs: users.packs,
                suspendedAt: users.suspendedAt,
            })
            .from(users)
            .where(eq(users.id, userId));
        return row ?? null;
    };
    return {
        find: async (userId) => {
            const id = await teamIdOf(db, userId);
            if (!id) return null;
            const [team] = await db.select().from(teams).where(eq(teams.id, id));
            const owner = team ? await accountOf(team.ownerId) : null;
            if (!team || !owner) return null;
            const rows = await db
                .select({
                    id: pages.id,
                    userId: pages.userId,
                    handle: pages.handle,
                    draft: pages.draft,
                    published: pages.published,
                    editor: users.editor,
                })
                .from(pages)
                .leftJoin(users, eq(pages.userId, users.id))
                .where(eq(pages.teamId, id))
                .orderBy(asc(pages.createdAt), asc(pages.id));
            const [me] = await db
                .select({ editor: users.editor })
                .from(users)
                .where(eq(users.id, userId));
            const roleOf = (person: string | null, editor: boolean | null): TeamRole =>
                person === team.ownerId ? "owner" : editor ? "editor" : "member";
            const role = roleOf(userId, me?.editor ?? false);
            const joined = rows.filter((row) => row.userId !== null);
            const own = rows.filter((row) => row.userId === null);
            const look = own[0];
            if (!look) return null;
            const person = (row: (typeof rows)[number]): TeamPerson => ({
                pageId: row.id,
                handle: row.handle,
                name: nameOf(row.draft) || row.handle,
                photo: photoOf(row.draft),
                role: roleOf(row.userId, row.editor),
                you: row.userId === userId,
                live: row.published !== null,
            });
            const ownerRow = joined.find((row) => row.userId === team.ownerId);
            const others = joined.filter((row) => row.userId !== team.ownerId).map(person);
            return {
                id,
                ownerId: team.ownerId,
                held: rows.length,
                name: nameOf(look.draft),
                handle: look.handle,
                lookPageId: look.id,
                lookLive: look.published !== null,
                role,
                owner: { plan: owner.plan, endsAt: owner.endsAt, packs: owner.packs },
                ownerSuspended: owner.suspendedAt !== null,
                invitesFrom: team.invitesFrom,
                people: [
                    ownerRow
                        ? person(ownerRow)
                        : {
                              pageId: null,
                              handle: null,
                              name: "",
                              photo: null,
                              role: "owner",
                              you: team.ownerId === userId,
                              live: false,
                          },
                    ...others,
                ],
                pages: role === "member" ? [] : await listOwnOfTeam(db, id, userId),
                myPageId: joined.find((row) => row.userId === userId)?.id ?? null,
            };
        },
        invite: async (teamId, pageId) => {
            const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
            const owner = team ? await accountOf(team.ownerId) : null;
            const id = await lookPageId(db, teamId);
            if (!team || !owner || !id) return null;
            const [look] = await db
                .select({ handle: pages.handle, draft: pages.draft, published: pages.published })
                .from(pages)
                .where(eq(pages.id, id));
            if (!look) return null;
            const [made] =
                pageId && pageId !== id
                    ? await db
                          .select({ id: pages.id, handle: pages.handle, draft: pages.draft })
                          .from(pages)
                          .where(
                              and(
                                  eq(pages.id, pageId),
                                  eq(pages.teamId, teamId),
                                  isNull(pages.userId),
                              ),
                          )
                    : [];
            return {
                id: teamId,
                ownerId: team.ownerId,
                name: nameOf(look.draft),
                handle: look.handle,
                owner: { plan: owner.plan, endsAt: owner.endsAt, packs: owner.packs },
                ownerSuspended: owner.suspendedAt !== null,
                invitesFrom: team.invitesFrom,
                look: look.published ? readPage(look.published) : null,
                held: await pagesHeld(db, teamId),
                made: made ? { id: made.id, handle: made.handle, name: nameOf(made.draft) } : null,
            };
        },
        ownerOf: async (userId) => {
            const id = await teamIdOf(db, userId);
            if (!id) return null;
            const [row] = await db
                .select({
                    id: users.id,
                    plan: users.plan,
                    endsAt: users.endsAt,
                    packs: users.packs,
                })
                .from(teams)
                .innerJoin(users, eq(teams.ownerId, users.id))
                .where(eq(teams.id, id));
            return row
                ? { id: row.id, account: { plan: row.plan, endsAt: row.endsAt, packs: row.packs } }
                : null;
        },
        create: async (userId, { handle, page, join }) =>
            db.transaction(async (tx) => {
                const [person] = await tx
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.id, userId))
                    .for("update");
                if (!person) return FIRST_PAGE;
                if (await isOnTeam(tx, userId)) return "on-team";
                const [team] = await tx
                    .insert(teams)
                    .values({ ownerId: userId, invitesFrom: new Date() })
                    .returning({ id: teams.id });
                if (!team) return "on-team";
                const [made] = await tx
                    .insert(pages)
                    .values({ teamId: team.id, handle, draft: page })
                    .onConflictDoNothing({ target: pages.handle })
                    .returning({ id: pages.id });
                if (!made) {
                    await tx.delete(teams).where(eq(teams.id, team.id));
                    return "taken";
                }
                if (join) {
                    const moved = await tx
                        .update(pages)
                        .set({ teamId: team.id })
                        .where(and(eq(pages.id, join), eq(pages.userId, userId)))
                        .returning({ id: pages.id });
                    if (!moved.length) {
                        await tx.delete(teams).where(eq(teams.id, team.id));
                        return "missing";
                    }
                }
                return { id: team.id };
            }),
        join: async (teamId, userId, page, most) =>
            db.transaction(async (tx): Promise<JoinResult> => {
                const team = await lockTeam(tx, teamId);
                if (!team) return "ended";
                await tx.insert(users).values({ id: userId }).onConflictDoNothing();
                await tx
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.id, userId))
                    .for("update");
                if (await isOnTeam(tx, userId)) return "on-team";
                // A page made for them is already counted, so claiming it needs no more room.
                if (!("made" in page) && (await pagesHeld(tx, teamId)) >= most) return "full";
                if ("made" in page) {
                    if (page.made === (await lookPageId(tx, teamId))) return "taken";
                    const [claimed] = await tx
                        .update(pages)
                        .set({ userId })
                        .where(
                            and(
                                eq(pages.id, page.made),
                                eq(pages.teamId, teamId),
                                isNull(pages.userId),
                            ),
                        )
                        .returning({ handle: pages.handle });
                    return claimed ?? "taken";
                }
                const [moved] = await tx
                    .update(pages)
                    .set({ teamId })
                    .where(and(eq(pages.id, page.own), eq(pages.userId, userId)))
                    .returning({ handle: pages.handle });
                return moved ?? "missing";
            }),
        leave: async (userId) =>
            db.transaction(async (tx) => {
                const id = await teamIdOf(tx, userId);
                const team = id ? await lockTeam(tx, id) : null;
                if (!team) return "missing";
                if (team.ownerId === userId) return "owner";
                await tx
                    .update(pages)
                    .set({ teamId: null })
                    .where(and(eq(pages.userId, userId), eq(pages.teamId, team.id)));
                await tx.update(users).set({ editor: false }).where(eq(users.id, userId));
                return "left";
            }),
        remove: async (teamId, handle) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team) return "missing";
                const [page] = await tx
                    .select({ id: pages.id, userId: pages.userId })
                    .from(pages)
                    .where(and(eq(pages.handle, handle), eq(pages.teamId, teamId)));
                if (!page?.userId) return "missing";
                if (page.userId === team.ownerId) return "owner";
                await tx.update(pages).set({ teamId: null }).where(eq(pages.id, page.id));
                await tx.update(users).set({ editor: false }).where(eq(users.id, page.userId));
                await tx.update(teams).set({ invitesFrom: new Date() }).where(eq(teams.id, teamId));
                return { userId: page.userId };
            }),
        setRole: async (teamId, handle, editor) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team) return "missing";
                const [page] = await tx
                    .select({ userId: pages.userId })
                    .from(pages)
                    .where(and(eq(pages.handle, handle), eq(pages.teamId, teamId)));
                if (!page?.userId) return "missing";
                if (page.userId === team.ownerId) return "owner";
                await tx.update(users).set({ editor }).where(eq(users.id, page.userId));
                return "set";
            }),
        setPage: async (teamId, userId, pageId, most) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team || (pageId === null && team.ownerId !== userId)) return false;
                if (pageId) {
                    const [mine] = await tx
                        .select({ id: pages.id })
                        .from(pages)
                        .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));
                    if (!mine) return false;
                }
                await tx
                    .update(pages)
                    .set({ teamId: null })
                    .where(and(eq(pages.userId, userId), eq(pages.teamId, teamId)));
                if (pageId) {
                    await tx.update(pages).set({ teamId }).where(eq(pages.id, pageId));
                    if ((await pagesHeld(tx, teamId)) > most) tx.rollback();
                }
                return true;
            }),
        addPage: async (teamId, { id, handle, draft }, most) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team) return "full";
                if ((await pagesHeld(tx, teamId)) >= most) return "full";
                const made = await tx
                    .insert(pages)
                    .values({ id, teamId, handle, draft })
                    .onConflictDoNothing({ target: pages.handle })
                    .returning({ id: pages.id });
                return made.length ? "added" : "taken";
            }),
        endInvites: async (teamId) => {
            await db.update(teams).set({ invitesFrom: new Date() }).where(eq(teams.id, teamId));
        },
        takeOver: async (teamId, userId, pageId) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team) return false;
                const [held] = await tx
                    .select({ id: pages.id })
                    .from(pages)
                    .where(
                        and(
                            eq(pages.id, pageId),
                            eq(pages.userId, userId),
                            eq(pages.teamId, teamId),
                        ),
                    );
                if (!held || team.ownerId === userId) return false;
                await tx
                    .update(teams)
                    .set({ ownerId: userId, invitesFrom: new Date() })
                    .where(eq(teams.id, teamId));
                await tx
                    .update(users)
                    .set({ editor: false })
                    .where(inArray(users.id, [userId, team.ownerId]));
                return true;
            }),
        deleteTeam: async (teamId) =>
            db.transaction(async (tx) => {
                const team = await lockTeam(tx, teamId);
                if (!team) return [];
                const rows = await tx
                    .select({ handle: pages.handle, userId: pages.userId })
                    .from(pages)
                    .where(eq(pages.teamId, teamId));
                const members = rows.flatMap((row) => (row.userId ? [row.userId] : []));
                // Cleared first, or the cascade below would take members' pages with the team.
                await tx
                    .update(pages)
                    .set({ teamId: null })
                    .where(and(eq(pages.teamId, teamId), isNotNull(pages.userId)));
                if (members.length) {
                    await tx.update(users).set({ editor: false }).where(inArray(users.id, members));
                }
                const [owner] = await tx
                    .select({ suspendedAt: users.suspendedAt })
                    .from(users)
                    .where(eq(users.id, team.ownerId));
                await tx.delete(teams).where(eq(teams.id, teamId));
                const own = rows.filter((row) => row.userId === null);
                // Otherwise deleting the team would free addresses that were taken down.
                if (owner?.suspendedAt && own.length) {
                    const id = `removed:${teamId}`;
                    await tx.insert(users).values({ id, suspendedAt: owner.suspendedAt });
                    await tx.insert(pages).values(
                        own.map(({ handle }) => ({
                            userId: id,
                            handle,
                            draft: starterPage(""),
                        })),
                    );
                }
                return rows.map((row) => row.handle);
            }),
    };
}
