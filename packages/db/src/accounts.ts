import { readPage, starterPage } from "@tondo/page";
import type { Page, Plan } from "@tondo/page";
import { and, asc, eq, isNull, sql, TransactionRollbackError } from "drizzle-orm";
import type { Db } from "./client";
import { listPagesOf, listReachableBy } from "./pages";
import type { PageSummary, TeamRole } from "./pages";
import { pages, teams, usage, users } from "./schema";

/** The parts of an account Tondo keeps. People themselves live in Neon Auth. */
export interface AccountStore {
    /** Oldest first. None means this person hasn't claimed an address yet. */
    listPages: (userId: string) => Promise<PageSummary[]>;
    /** Their own pages and every page they can edit on a team. */
    listReachable: (userId: string) => Promise<PageSummary[]>;
    /** Whether they own a team, which has to be handed over or deleted before they can go. */
    ownsTeam: (userId: string) => Promise<boolean>;
    /** The team they're on, if any, for the app to name. */
    teamLine: (userId: string) => Promise<{ name: string; role: TeamRole } | null>;
    handleTaken: (handle: string) => Promise<boolean>;
    /** False if the address is taken. Someone who already has pages keeps them. */
    claimHandle: (userId: string, handle: string, page: Page) => Promise<boolean>;
    /** Someone with no row yet, such as a person in the start flow, is on Free. */
    findPlan: (userId: string) => Promise<{ plan: Plan; endsAt: Date | null }>;
    findStripeId: (userId: string) => Promise<string | null>;
    /** Keeps the first id saved, so two tabs can't leave two customers. Returns the id kept. */
    setStripeId: (userId: string, stripeId: string) => Promise<string | null>;
    /**
     * Copies a plan from Stripe, and returns the person's id. Null if nobody has this customer. With
     * `ifEmpty`, a stored end date stays.
     */
    setPlan: (
        stripeId: string,
        plan: { plan: Plan; endsAt: Date | null; ifEmpty?: boolean },
    ) => Promise<string | null>;
    /** Removes the person's addresses, pages and counts. A suspended person's addresses stay out of use. */
    removeUser: (userId: string) => Promise<void>;
}

export function createAccountStore(db: Db): AccountStore {
    return {
        listPages: (userId) => listPagesOf(db, userId),
        listReachable: (userId) => listReachableBy(db, userId),
        ownsTeam: async (userId) => {
            const [row] = await db
                .select({ id: teams.id })
                .from(teams)
                .where(eq(teams.ownerId, userId));
            return row !== undefined;
        },
        teamLine: async (userId) => {
            const [row] = await db
                .select({ id: teams.id, ownerId: teams.ownerId, editor: users.editor })
                .from(teams)
                .innerJoin(users, eq(users.id, userId))
                .where(
                    sql`${teams.ownerId} = ${userId} or ${teams.id} = (
                        select j.team_id from pages j
                        where j.user_id = ${userId} and j.team_id is not null
                    )`,
                );
            if (!row) return null;
            const [look] = await db
                .select({ draft: pages.draft })
                .from(pages)
                .where(and(eq(pages.teamId, row.id), isNull(pages.userId)))
                .orderBy(asc(pages.createdAt), asc(pages.id))
                .limit(1);
            return {
                name: look ? readPage(look.draft).header.name : "",
                role: row.ownerId === userId ? "owner" : row.editor ? "editor" : "member",
            };
        },
        handleTaken: async (handle) => {
            const [row] = await db
                .select({ id: pages.id })
                .from(pages)
                .where(eq(pages.handle, handle));
            return row !== undefined;
        },
        claimHandle: async (userId, handle, page) => {
            const existing = await listPagesOf(db, userId);
            if (existing.length) return existing.some((other) => other.handle === handle);
            try {
                await db.transaction(async (tx) => {
                    await tx.insert(users).values({ id: userId }).onConflictDoNothing();
                    const [made] = await tx
                        .insert(pages)
                        .values({ userId, handle, draft: page })
                        .onConflictDoNothing({ target: pages.handle })
                        .returning({ id: pages.id });
                    if (!made) tx.rollback();
                });
                return true;
            } catch (error) {
                if (error instanceof TransactionRollbackError) return false;
                throw error;
            }
        },
        findPlan: async (userId) => {
            const [row] = await db
                .select({ plan: users.plan, endsAt: users.endsAt })
                .from(users)
                .where(eq(users.id, userId));
            return row ?? { plan: "free", endsAt: null };
        },
        findStripeId: async (userId) => {
            const [row] = await db
                .select({ stripeId: users.stripeId })
                .from(users)
                .where(eq(users.id, userId));
            return row?.stripeId ?? null;
        },
        setStripeId: async (userId, stripeId) => {
            await db
                .update(users)
                .set({ stripeId })
                .where(and(eq(users.id, userId), isNull(users.stripeId)));
            const [row] = await db
                .select({ stripeId: users.stripeId })
                .from(users)
                .where(eq(users.id, userId));
            return row?.stripeId ?? null;
        },
        setPlan: async (stripeId, { plan, endsAt, ifEmpty }) => {
            const [row] = await db
                .update(users)
                .set({ plan, endsAt: ifEmpty ? sql`coalesce(${users.endsAt}, ${endsAt})` : endsAt })
                .where(eq(users.stripeId, stripeId))
                .returning({ id: users.id });
            return row?.id ?? null;
        },
        removeUser: async (userId) => {
            await db.transaction(async (tx) => {
                await tx.delete(usage).where(eq(usage.userId, userId));
                const held = await tx
                    .select({ handle: pages.handle })
                    .from(pages)
                    .where(eq(pages.userId, userId));
                const [gone] = await tx
                    .delete(users)
                    .where(eq(users.id, userId))
                    .returning({ suspendedAt: users.suspendedAt });
                // Otherwise deleting the account and signing up again would bring the pages back.
                if (gone?.suspendedAt && held.length) {
                    const id = `removed:${userId}`;
                    await tx.insert(users).values({ id, suspendedAt: gone.suspendedAt });
                    await tx.insert(pages).values(
                        held.map(({ handle }) => ({
                            userId: id,
                            handle,
                            draft: starterPage(""),
                        })),
                    );
                }
            });
        },
    };
}
