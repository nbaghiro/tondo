import { and, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { usage } from "./schema";

export interface UsageStore {
    spentThisMonth: (userId: string, month: string) => Promise<number>;
    /** Adds credits unless that would pass the limit. Returns the new total, or null if refused. */
    spend: (
        userId: string,
        month: string,
        credits: number,
        limit: number,
    ) => Promise<number | null>;
}

/** "2026-11", in UTC, so every server agrees when a month starts. */
export const monthOf = (now: Date): string => now.toISOString().slice(0, 7);

export function createUsageStore(db: Db): UsageStore {
    return {
        spentThisMonth: async (userId, month) => {
            const [row] = await db
                .select({ credits: usage.credits })
                .from(usage)
                .where(and(eq(usage.userId, userId), eq(usage.month, month)));
            return row?.credits ?? 0;
        },
        spend: async (userId, month, credits, limit) => {
            if (credits > limit) return null;
            const rows = await db
                .insert(usage)
                .values({ userId, month, credits })
                .onConflictDoUpdate({
                    target: [usage.userId, usage.month],
                    set: { credits: sql`${usage.credits} + excluded.credits` },
                    setWhere: sql`${usage.credits} + excluded.credits <= ${limit}`,
                })
                .returning({ credits: usage.credits });
            return rows[0]?.credits ?? null;
        },
    };
}
