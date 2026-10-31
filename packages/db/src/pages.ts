import { pageSchema } from "@tondo/page";
import type { Page } from "@tondo/page";
import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { pages, users } from "./schema";

const MAIN_PAGE = "";

/** The live version of a user's main page. Null if it doesn't exist or isn't published. */
export async function findPublishedPage(db: Db, handle: string): Promise<Page | null> {
    const [row] = await db
        .select({ published: pages.published })
        .from(pages)
        .innerJoin(users, eq(pages.userId, users.id))
        .where(and(eq(users.handle, handle), eq(pages.slug, MAIN_PAGE)))
        .limit(1);
    return row?.published ? pageSchema.parse(row.published) : null;
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
