// Takes a page down, or puts it back: pnpm --filter @tondo/db suspend <address> [--lift]
import { eq, sql } from "drizzle-orm";
import { createDb } from "./client";
import { users } from "./schema";

const handle = process.argv[2];
const lift = process.argv.includes("--lift");
if (!handle) throw new Error("Say which address.");
const { db, close } = createDb();
const rows = await db
    .update(users)
    .set({ suspendedAt: lift ? null : sql`now()` })
    .where(eq(users.handle, handle))
    .returning({ handle: users.handle });
await close();
process.stdout.write(
    rows.length
        ? `${lift ? "Restored" : "Suspended"} tondo.page/${handle}. Allow 15 seconds for the cache.\n`
        : `No page at ${handle}.\n`,
);
