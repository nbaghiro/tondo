import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function databaseUrl(): string {
    return process.env["DATABASE_URL"] ?? "postgres://tondo:tondo@127.0.0.1:8102/tondo";
}

export function createDb(url = databaseUrl()) {
    const client = postgres(url, { onnotice: () => undefined });
    return { db: drizzle(client, { schema }), close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>["db"];
