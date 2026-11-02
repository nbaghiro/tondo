// Gives Pro for free: pnpm --filter @tondo/db comp <address> [--months 12], or --all instead of an
// address. Anyone paying through Stripe is skipped.
import { and, isNull, sql } from "drizzle-orm";
import { createDb } from "./client";
import { users } from "./schema";

const args = process.argv.slice(2);
const at = args.indexOf("--months");
const months = at < 0 ? 12 : Number(args[at + 1]);
const all = args.includes("--all");
const handle = args.find((arg, i) => !arg.startsWith("--") && (at < 0 || i !== at + 1));
if (!all && !handle) throw new Error("Say which address, or --all.");
if (!Number.isInteger(months) || months < 1) throw new Error("Use a whole number of months.");

const { db, close } = createDb();
const rows = await db
    .update(users)
    .set({ plan: "pro", endsAt: sql`now() + make_interval(months => ${months})` })
    .where(
        and(
            isNull(users.stripeId),
            all
                ? undefined
                : sql`${users.id} = (
                      select coalesce(p.user_id, t.owner_id)
                      from pages p left join teams t on t.id = p.team_id
                      where p.handle = ${handle ?? ""}
                  )`,
        ),
    )
    .returning({ id: users.id });
await close();
process.stdout.write(`Gave ${String(months)} months of Pro to ${String(rows.length)} accounts.\n`);
