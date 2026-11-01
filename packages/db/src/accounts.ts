import type { Page, Plan } from "@tondo/page";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Db } from "./client";
import { pages, usage, users } from "./schema";

/** The parts of an account Tondo keeps. People themselves live in Neon Auth. */
export interface AccountStore {
    /** The address someone has claimed, or null if they haven't yet. */
    findHandle: (userId: string) => Promise<string | null>;
    handleTaken: (handle: string) => Promise<boolean>;
    /** False if the address is taken. Someone who already has an address keeps it. */
    claimHandle: (userId: string, handle: string, page: Page) => Promise<boolean>;
    /** False if the address is taken. */
    changeHandle: (userId: string, handle: string) => Promise<boolean>;
    /** Whether this person's page has been taken down. */
    isSuspended: (userId: string) => Promise<boolean>;
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
    /** Removes the person's address, pages and counts. A suspended address stays out of use. */
    removeUser: (userId: string) => Promise<void>;
}

export function createAccountStore(db: Db): AccountStore {
    const findHandle = async (userId: string) => {
        const [row] = await db
            .select({ handle: users.handle })
            .from(users)
            .where(eq(users.id, userId));
        return row?.handle ?? null;
    };
    return {
        findHandle,
        handleTaken: async (handle) => {
            const [row] = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.handle, handle));
            return row !== undefined;
        },
        claimHandle: async (userId, handle, page) => {
            const existing = await findHandle(userId);
            if (existing) return existing === handle;
            return db.transaction(async (tx) => {
                const [user] = await tx
                    .insert(users)
                    .values({ id: userId, handle })
                    .onConflictDoNothing()
                    .returning({ id: users.id });
                if (!user) return false;
                await tx.insert(pages).values({ userId, draft: page });
                return true;
            });
        },
        changeHandle: async (userId, handle) => {
            const taken = await db
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.handle, handle), ne(users.id, userId)));
            if (taken.length) return false;
            const rows = await db
                .update(users)
                .set({ handle })
                .where(eq(users.id, userId))
                .returning({ id: users.id })
                .catch(() => []);
            return rows.length > 0;
        },
        isSuspended: async (userId) => {
            const [row] = await db
                .select({ suspendedAt: users.suspendedAt })
                .from(users)
                .where(eq(users.id, userId));
            return Boolean(row?.suspendedAt);
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
                const [gone] = await tx
                    .delete(users)
                    .where(eq(users.id, userId))
                    .returning({ handle: users.handle, suspendedAt: users.suspendedAt });
                // Otherwise deleting the account and signing up again would bring the page back.
                if (gone?.suspendedAt) {
                    await tx.insert(users).values({
                        id: `removed:${gone.handle}`,
                        handle: gone.handle,
                        suspendedAt: gone.suspendedAt,
                    });
                }
            });
        },
    };
}
