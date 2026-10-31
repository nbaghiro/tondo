import type { Page } from "@tondo/page";
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { pages, users } from "./schema";

/** The parts of an account Tondo keeps. People themselves live in Neon Auth. */
export interface AccountStore {
    /** The address someone has claimed, or null if they haven't yet. */
    findHandle: (userId: string) => Promise<string | null>;
    /** False if the address is taken. Someone who already has an address keeps it. */
    claimHandle: (userId: string, handle: string, page: Page) => Promise<boolean>;
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
    };
}
