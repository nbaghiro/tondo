import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";

const { db, close } = createDb();
await migrate(db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
await close();
process.stdout.write("Migrations applied.\n");
