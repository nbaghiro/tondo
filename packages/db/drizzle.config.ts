// Used by `pnpm db:generate` and `pnpm db:studio`. Applying migrations is src/migrate.ts.
import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/client";

export default defineConfig({
    schema: "./src/schema.ts",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: { url: databaseUrl() },
});
