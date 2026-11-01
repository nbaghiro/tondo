// Takes a person's pages down, or puts them back, found by any one of their addresses: pnpm --filter @tondo/db suspend <address> [--lift]
import { eq, inArray, sql } from "drizzle-orm";
import { createDb } from "./client";
import { pages, users } from "./schema";

const handle = process.argv[2];
const lift = process.argv.includes("--lift");
if (!handle) throw new Error("Say which address.");
const { db, close } = createDb();
const rows = await db
    .update(users)
    .set({ suspendedAt: lift ? null : sql`now()` })
    .where(
        inArray(
            users.id,
            db.select({ id: pages.userId }).from(pages).where(eq(pages.handle, handle)),
        ),
    )
    .returning({ stripeId: users.stripeId });
await close();
if (!lift && rows[0]?.stripeId) {
    process.stdout.write(
        "This account has a Stripe customer, and suspending doesn't cancel billing. Decide about that in the Dashboard.\n",
    );
}
process.stdout.write(
    rows.length
        ? `${lift ? "Restored" : "Suspended"} tondo.page/${handle}. Allow 15 seconds for the cache.\n`
        : `No page at ${handle}.\n`,
);
