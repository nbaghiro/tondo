import type { Page } from "@tondo/page";
import { and, eq, ne } from "drizzle-orm";
import type { Db } from "./client";
import { pages, users } from "./schema";

/** The parts of an account Tondo keeps. People themselves live in Neon Auth. */
export interface AccountStore {
    /** The address someone has claimed, or null if they haven't yet. */
    findHandle: (userId: string) => Promise<string | null>;
    handleTaken: (handle: string) => Promise<boolean>;
    /** False if the address is taken. Someone who already has an address keeps it. */
    claimHandle: (userId: string, handle: string, page: Page) => Promise<boolean>;
    /** False if the address is taken. */
    changeHandle: (userId: string, handle: string) => Promise<boolean>;
    /** Removes the person's address, pages and counts. */
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
        removeUser: async (userId) => {
            await db.delete(users).where(eq(users.id, userId));
        },
    };
}
