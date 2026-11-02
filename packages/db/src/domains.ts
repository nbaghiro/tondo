import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import { domains, pages, teams } from "./schema";

export interface DomainRow {
    pageId: string;
    host: string;
    verified: boolean;
}

/** Everything the domain routes need from storage, so they can be tested without a database. */
export interface DomainStore {
    find: (pageId: string) => Promise<DomainRow | null>;
    /** The page holding this domain, which has proved it's theirs. */
    holder: (host: string) => Promise<{ pageId: string; handle: string } | null>;
    /** Every held domain, for the sitemap. */
    listHeld: () => Promise<{ host: string; handle: string }[]>;
    /** False if this page already has a domain. */
    add: (pageId: string, host: string) => Promise<boolean>;
    /** False if another page holds the domain. */
    verify: (pageId: string) => Promise<boolean>;
    /** Stops this page holding its domain, once the domain's records name someone else. */
    release: (pageId: string) => Promise<void>;
    remove: (pageId: string) => Promise<void>;
    /** Domains held by this person's pages and any team they own. These go when the account does. */
    heldBy: (userId: string) => Promise<string[]>;
}

const isUniqueViolation = (error: unknown): boolean => {
    const { code, cause } = error as { code?: unknown; cause?: { code?: unknown } };
    return code === "23505" || cause?.code === "23505";
};

export function createDomainStore(db: Db): DomainStore {
    return {
        find: async (pageId) => {
            const [row] = await db.select().from(domains).where(eq(domains.pageId, pageId));
            return row
                ? { pageId: row.pageId, host: row.host, verified: row.verifiedAt !== null }
                : null;
        },
        holder: async (host) => {
            const [row] = await db
                .select({ pageId: domains.pageId, handle: pages.handle })
                .from(domains)
                .innerJoin(pages, eq(domains.pageId, pages.id))
                .where(and(eq(domains.host, host), isNotNull(domains.verifiedAt)));
            return row ?? null;
        },
        listHeld: () =>
            db
                .select({ host: domains.host, handle: pages.handle })
                .from(domains)
                .innerJoin(pages, eq(domains.pageId, pages.id))
                .where(isNotNull(domains.verifiedAt)),
        add: async (pageId, host) => {
            const rows = await db
                .insert(domains)
                .values({ pageId, host })
                .onConflictDoNothing({ target: domains.pageId })
                .returning({ pageId: domains.pageId });
            return rows.length > 0;
        },
        verify: async (pageId) => {
            try {
                await db
                    .update(domains)
                    .set({ verifiedAt: sql`now()` })
                    .where(and(eq(domains.pageId, pageId), isNull(domains.verifiedAt)));
                return true;
            } catch (error) {
                if (isUniqueViolation(error)) return false;
                throw error;
            }
        },
        release: async (pageId) => {
            await db.update(domains).set({ verifiedAt: null }).where(eq(domains.pageId, pageId));
        },
        remove: async (pageId) => {
            await db.delete(domains).where(eq(domains.pageId, pageId));
        },
        heldBy: async (userId) => {
            const rows = await db
                .select({ host: domains.host })
                .from(domains)
                .innerJoin(pages, eq(domains.pageId, pages.id))
                .leftJoin(teams, eq(pages.teamId, teams.id))
                .where(
                    and(
                        isNotNull(domains.verifiedAt),
                        or(
                            eq(pages.userId, userId),
                            and(isNull(pages.userId), eq(teams.ownerId, userId)),
                        ),
                    ),
                );
            return rows.map((row) => row.host);
        },
    };
}
